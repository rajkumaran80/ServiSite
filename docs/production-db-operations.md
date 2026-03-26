# Production Database Operations

> The production PostgreSQL server has **no public access** — it runs on a private Azure VNet.
> All operations against it must be run from within the same VNet using Azure Container Instances (ACI).

---

## How migrations work on startup

The backend Docker container runs this on every start:

```
npx prisma migrate deploy && node dist/main
```

This applies any **new** migration files found in `backend/prisma/migrations/`. Safe to run repeatedly — already-applied migrations are skipped.

**Critical:** Migration files **must be committed to git**. They are baked into the Docker image at build time. If gitignored, `migrate deploy` finds nothing and tables are never created.

---

## How seeding works

The seed (`backend/src/prisma/seed.ts`) creates demo tenants and the platform superadmin user. It **does NOT run automatically** on startup or deployment — it must be triggered manually via ACI.

The seed is idempotent: it checks for existing records before inserting, so running it twice is safe.

---

## Quick checklist — before you start

- [ ] Azure CLI logged in: `az login`
- [ ] Contributor access to `servisite-rg`
- [ ] Know your current public IP: `curl -s https://api.ipify.org`

---

## Full procedure

### Step 0 — Recreate the ACI subnet (deleted after each use for security)

The `snet-aci-temp` subnet is deleted after every operation as part of security cleanup. Recreate it before proceeding:

```bash
az network vnet subnet create \
  --resource-group servisite-rg \
  --vnet-name servisite-prod-vnet \
  --name snet-aci-temp \
  --address-prefixes 10.0.3.0/24 \
  --delegations Microsoft.ContainerInstance/containerGroups
```

---

### Step 1 — Get the current backend Docker image tag

```bash
az acr repository show-tags \
  --name servisite \
  --repository backend \
  --orderby time_desc \
  --top 1 \
  -o tsv
```

Note the tag (e.g. `abc1234def`). Use it in Step 4.

---

### Step 2 — Temporarily enable ACR admin credentials

ACR admin is disabled by default. Enable it just long enough to get credentials for ACI to pull the image.

```bash
az acr update -n servisite --admin-enabled true

az acr credential show -n servisite \
  --query "{user:username,pass:passwords[0].value}" -o json
```

Save the `user` and `pass` values — you'll need them in Step 4.

---

### Step 3 — Get the DB password from Key Vault

Key Vault has no public IP rules by default. Temporarily add your IP:

```bash
MY_IP=$(curl -s https://api.ipify.org)
az keyvault network-rule add \
  --name servisiteprodkv \
  --resource-group servisite-rg \
  --ip-address "$MY_IP"

# Get the password
az keyvault secret show \
  --vault-name servisiteprodkv \
  --name db-password \
  --query value -o tsv

# Remove your IP immediately after — do NOT leave it open
az keyvault network-rule remove \
  --name servisiteprodkv \
  --resource-group servisite-rg \
  --ip-address "$MY_IP"
```

Full connection string:
```
postgresql://servisiteadmin:<db-password>@servisite-prod-postgres.postgres.database.azure.com:5432/servisitedb?sslmode=require
```

---

### Step 4 — Launch the ACI container

Replace `<IMAGE_TAG>`, `<ACR_USER>`, `<ACR_PASS>`, `<DB_PASSWORD>` with values from the steps above.

**To run the full seed:**

```bash
az container create \
  --resource-group servisite-rg \
  --name servisite-db-runner \
  --image servisite.azurecr.io/backend:<IMAGE_TAG> \
  --registry-login-server servisite.azurecr.io \
  --registry-username <ACR_USER> \
  --registry-password "<ACR_PASS>" \
  --vnet servisite-prod-vnet \
  --subnet snet-aci-temp \
  --restart-policy Never \
  --environment-variables \
    NODE_ENV=production \
    DATABASE_URL="postgresql://servisiteadmin:<DB_PASSWORD>@servisite-prod-postgres.postgres.database.azure.com:5432/servisitedb?sslmode=require" \
  --command-line 'node -e "const {execSync}=require(\"child_process\");execSync(\"node dist/prisma/seed.js\",{cwd:\"/app\",stdio:\"inherit\"});"' \
  --no-wait
```

**To add a single SUPER_ADMIN user instead:**

```bash
az container create \
  --resource-group servisite-rg \
  --name servisite-db-runner \
  --image servisite.azurecr.io/backend:<IMAGE_TAG> \
  --registry-login-server servisite.azurecr.io \
  --registry-username <ACR_USER> \
  --registry-password "<ACR_PASS>" \
  --vnet servisite-prod-vnet \
  --subnet snet-aci-temp \
  --restart-policy Never \
  --environment-variables \
    NODE_ENV=production \
    DATABASE_URL="postgresql://servisiteadmin:<DB_PASSWORD>@servisite-prod-postgres.postgres.database.azure.com:5432/servisitedb?sslmode=require" \
  --command-line 'node -e "
const {PrismaClient,UserRole}=require(\"@prisma/client\");
const bcrypt=require(\"bcrypt\");
const p=new PrismaClient();
(async()=>{
  const t=await p.tenant.findUnique({where:{slug:\"platform\"}});
  const h=await bcrypt.hash(\"<NEW_PASSWORD>\",12);
  const u=await p.user.upsert({
    where:{tenantId_email:{tenantId:t.id,email:\"<EMAIL>\"}},
    create:{tenantId:t.id,email:\"<EMAIL>\",passwordHash:h,role:UserRole.SUPER_ADMIN},
    update:{passwordHash:h,role:UserRole.SUPER_ADMIN}
  });
  console.log(\"USER_OK:\",u.email,u.role);
  await p.\$disconnect();
})().catch(e=>{console.log(\"ERR:\",e.message);process.exit(1)});"' \
  --no-wait
```

> **Important:** Keep the script on one line and escape inner double-quotes as `\"`.
> Do NOT use `sh -c` or chain commands with `&&` in `--command-line` — ACI exits with code 2 (shell parse error).

---

### Step 5 — Check output

`az container logs` is unreliable for VNet-attached containers. Use the REST API:

```bash
SUBSCRIPTION="8ecb7c89-073f-45a8-88b5-49ef2708228b"
RG="servisite-rg"
NAME="servisite-db-runner"

az rest \
  --method GET \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION}/resourceGroups/${RG}/providers/Microsoft.ContainerInstance/containerGroups/${NAME}/containers/${NAME}/logs?api-version=2022-10-01-preview&tail=50" \
  --query "content" -o tsv
```

Wait 30–60 seconds after creation before running this.

---

### Step 6 — Re-secure everything (do this every time)

```bash
# 1. Delete the ACI container
az container delete --resource-group servisite-rg --name servisite-db-runner --yes

# 2. Delete the ACI subnet
az network vnet subnet delete \
  --resource-group servisite-rg \
  --vnet-name servisite-prod-vnet \
  --name snet-aci-temp

# 3. Disable ACR admin
az acr update -n servisite --admin-enabled false

# 4. Verify KV has no stray IP rules (should be empty)
az keyvault show --name servisiteprodkv \
  --query "properties.networkAcls.ipRules" -o json
```

---

## Resolving Prisma migration conflicts (P3009)

If the backend startup logs show:

```
P3009: migrate found failed migrations in the target database
```

The `_prisma_migrations` table has a failed entry blocking all migrations. Fix by marking each as applied via ACI (use Step 4 `--command-line`):

```
node -e "
const {execSync}=require(\"child_process\");
const migrations=[
  \"20260320163912_init\",
  \"20260320171605_add_menu_sections_and_item_fields\",
  \"20260320180000_rename_menu_section_to_menu_group\",
  \"20260320190000_menu_item_many_to_many_categories\",
  \"20260320200000_add_super_admin_role\",
  \"20260321100000_add_tenant_types\",
  \"20260321200000_add_navigation_and_pages\",
  \"20260321210000_add_page_entries\",
  \"20260322212558_add_custom_domain\"
];
for(const m of migrations){
  try{
    execSync(\"node node_modules/.bin/prisma migrate resolve --applied \"+m,
      {cwd:\"/app\",env:{...process.env},stdio:\"inherit\"});
    console.log(\"OK:\",m);
  }catch(e){console.log(\"SKIP:\",m,e.message.substring(0,50));}
}"
```

Add new migration names to the array as they are created.

---

## Azure resource reference

| Resource | Value |
|----------|-------|
| Resource group | `servisite-rg` |
| VNet | `servisite-prod-vnet` |
| ACI subnet | `snet-aci-temp` (recreate each time — deleted after use) |
| ACR | `servisite.azurecr.io` |
| Key Vault | `servisiteprodkv` |
| PostgreSQL FQDN | `servisite-prod-postgres.postgres.database.azure.com` |
| DB name | `servisitedb` |
| DB user | `servisiteadmin` |
| Subscription ID | `8ecb7c89-073f-45a8-88b5-49ef2708228b` |
