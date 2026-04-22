admin
======
1. Creatiung site should have option which subscription level

site admin
=========
1. Should be able to downgrade or upgrade
2. Should cancel subscription- it will update the db and send notification to super admin so that he can deal with refund via stripe.
3. admin appearance to have a top image for the menu page
4. no duplicate email

public site
========
menu filter, when typing the items displayed should be filtered, but when selecting other tabs it should be reset
when clicking popular items the page should navigate to the section in the menu
food menu top video or image
social media links if not empty
image animations when scrolling, text animation when pointing or mouse over
hover over slightly zoom image with some animation
updatable home page with any topic and photo and text , generic
eg ABOUT OUR MENU, OUR AUTHENTIC CHEFS, opening time, etc
no delay in item appearance when scrolling down


menu
🍽 Starters
Small Plates
Soups
Indian Starters
🍛 Mains
Veg Mains
Non-Veg Mains
Chef Specials
🍕 Pizza & Wraps
Pizza
Wraps
🍟 Sides
Fries
Extras
🍮 Desserts
Cakes
Ice Cream
🥤 Drinks
Soft Drinks
Hot Drinks
Alcohol (optional)

Azure certificate issue

To avoid going dark again, set up an alert:


az monitor metrics alert create \
  --name "AFD-Cert-Expiry-Alert" \
  --resource-group servisite-rg \
  --scopes "/subscriptions/8ecb7c89-073f-45a8-88b5-49ef2708228b/resourceGroups/servisite-rg/providers/Microsoft.Cdn/profiles/servisite-prod-fd" \
  --condition "avg PercentageOf4XXErrors > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group "email-alert"
Or more simply — put a recurring reminder in your calendar every 60 days to run:


az afd custom-domain show --profile-name servisite-prod-fd --resource-group servisite-rg --custom-domain-name wildcard-servisite-co-uk --query "{state:domainValidationState,expiry:validationProperties.expirationDate}" -o json
If state is not Approved, run regenerate-validation-token as we just did. The whole thing takes 30 minutes to fix.