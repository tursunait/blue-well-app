// Meal delivery links for each dish option
export interface MealDeliveryLink {
  url: string;
  restaurantName: string;
  dishName: string;
  service: "Grubhub" | "Uber Eats" | "DoorDash";
}

export const MEAL_DELIVERY_LINKS: Record<string, MealDeliveryLink[]> = {
  "Mediterranean Bowl": [
    {
      url: "https://www.ubereats.com/store/neomonde-mediterranean-durham/NU1A6AeUX4yuFg5X4A-0Cg?mod=quickView&modctx=%257B%2522storeUuid%2522%253A%2522354d40e8-0794-5f8c-ae16-0e57e00fb40a%2522%252C%2522sectionUuid%2522%253A%25220d3bfabd-52fc-59e4-92da-9b8fb96afaaa%2522%252C%2522subsectionUuid%2522%253A%25220379a62a-1156-4ddb-a09a-7e1dc45d5dfb%2522%252C%2522itemUuid%2522%253A%25222fc288e8-95c8-5da8-a7ae-894e8492bd5f%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&ps=1",
      restaurantName: "Neomonde Mediterranean",
      dishName: "Build a Bowl",
      service: "Uber Eats",
    },
    {
      url: "https://www.ubereats.com/store/adams-mediterranean-grill/j9qD-GepXuiC6Di9__SdYw?mod=quickView&modctx=%257B%2522storeUuid%2522%253A%25228fda83f8-67a9-5ee8-82e8-38bdfff49d63%2522%252C%2522sectionUuid%2522%253A%2522ff766a13-4e3a-59e4-893e-e74663831b90%2522%252C%2522subsectionUuid%2522%253A%2522c36382ac-9d46-5754-81aa-afd6b6ebf30b%2522%252C%2522itemUuid%2522%253A%25223570027f-cca2-5969-8ced-628a249cda73%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&ps=1",
      restaurantName: "Adam's Mediterranean Grill",
      dishName: "Regular Whatever Bowl",
      service: "Uber Eats",
    },
    {
      url: "https://www.ubereats.com/store/mediterranea-rice-bowls-8521-brier-creek-pkwy/fk_oLahBVvqnHTT1W6rKQA?diningMode=DELIVERY&mod=quickView&modctx=%257B%2522storeUuid%2522%253A%25227e4fe82d-a841-56fa-a71d-34f55baaca40%2522%252C%2522sectionUuid%2522%253A%252273ff9c32-5da9-50d2-bc67-c2ab22864da3%2522%252C%2522subsectionUuid%2522%253A%25220379a62a-1156-4ddb-a09a-7e1dc45d5dfb%2522%252C%2522itemUuid%2522%253A%25228f7e42ab-edee-56ad-8689-b1c8301c30b8%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&ps=1&surfaceName=",
      restaurantName: "Mediterranea Rice Bowls",
      dishName: "Chicken Shawarma Bowl",
      service: "Uber Eats",
    },
    {
      url: "https://www.ubereats.com/store/mediterra-grill-erwin-rd/j2pstk2wR_mWFqENltYhVA?diningMode=DELIVERY&mod=quickView&modctx=%257B%2522storeUuid%2522%253A%25228f6a6cb6-4db0-47f9-9616-a10d96d62154%2522%252C%2522sectionUuid%2522%253A%2522e22b8caa-d80a-4fdc-9e0b-6c47517bf33b%2522%252C%2522subsectionUuid%2522%253A%25225fd3a702-ce57-49c6-a3b2-0427b2617bb2%2522%252C%2522itemUuid%2522%253A%25229106f83a-ed20-4f94-9413-b5ed484c607e%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&ps=1&surfaceName=",
      restaurantName: "Mediterra Grill",
      dishName: "Tabouli Salad",
      service: "Uber Eats",
    },
    {
      url: "https://www.grubhub.com/restaurant/chopt-creative-salad-co-1490-fordham-blvd-chapel-hill/5813168/menu-item/276775795128?menu-item-options=2_3_4_5_6_7_8_88_128_141",
      restaurantName: "Chopt Creative Salad Co.",
      dishName: "Mediterranean Tahini Bowl",
      service: "Grubhub",
    },
  ],
  "Grilled Chicken Salad": [
    {
      url: "https://www.ubereats.com/store/carrabbas-5312-new-hope-commons-drive/QwNcQK9IR663ePJlhXycrg?diningMode=DELIVERY&mod=quickView&modctx=%257B%2522storeUuid%2522%253A%252243035c40-af48-47ae-b778-f265857c9cae%2522%252C%2522sectionUuid%2522%253A%2522f3a657f0-6958-5dd0-ba7f-5866514a3284%2522%252C%2522subsectionUuid%2522%253A%2522baa49d9d-d129-533e-a365-d1402adfffa7%2522%252C%2522itemUuid%2522%253A%25223aae0c26-2352-5f2c-aebe-d050b498bc04%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&ps=1&surfaceName=",
      restaurantName: "Carrabba's Italian Grill",
      dishName: "Italian Chicken Salad",
      service: "Uber Eats",
    },
    {
      url: "https://www.ubereats.com/store/thee-salad-bar/CWUdHbLtXCCpGI-ymPWjSA?diningMode=DELIVERY&mod=quickView&modctx=%257B%2522storeUuid%2522%253A%252209651d1d-b2ed-5c20-a918-8fb298f5a348%2522%252C%2522sectionUuid%2522%253A%2522853887ed-a531-5cf2-b310-9cfc58cec328%2522%252C%2522subsectionUuid%2522%253A%252205b7b16e-f79b-453f-bd48-0ea2f0707b54%2522%252C%2522itemUuid%2522%253A%252229532a20-19c5-4cb2-b16b-34c410731a83%2522%252C%2522showSeeDetailsCTA%2522%253Atrue%257D&pl=JTdCJTIyYWRkcmVzcyUyMiUzQSUyMkJvd2xlcm8lMjBEdXJoYW0lMjIlMkMlMjJyZWZlcmVuY2UlMjIlM0ElMjIxMjM3MGNlZC0zZjQ5LThiZmQtOGI5Ny1kOGI4NWJiZDIzNjQlMjIlMkMlMjJyZWZlcmVuY2VUeXBlJTIyJTNBJTIydWJlcl9wbGFjZXMlMjIlMkMlMjJsYXRpdHVkZSUyMiUzQTM1Ljk2NDAyJTJDJTIybG9uZ2l0dWRlJTIyJTNBLTc4Ljk3NDMzNSU3RA%3D%3D&ps=1",
      restaurantName: "Thee Salad Bar",
      dishName: "Chicken House Salad",
      service: "Uber Eats",
    },
    {
      url: "https://www.grubhub.com/restaurant/happy--hale-ninth-street-703b-9th-st-durham/6147656/menu-item/21282477753?menu-item-options=",
      restaurantName: "Happy & Hale",
      dishName: "Thai Chicken Crunch",
      service: "Grubhub",
    },
    {
      url: "https://www.grubhub.com/restaurant/chopt-creative-salad-co-1490-fordham-blvd-chapel-hill/5813168/menu-item/276775800696?menu-item-options=97_100",
      restaurantName: "Chopt Creative Salad Co.",
      dishName: "Grilled Chicken Salad",
      service: "Grubhub",
    },
  ],
  "Quinoa Power Bowl": [
    {
      url: "https://www.grubhub.com/restaurant/clean-eatz-mcfarland-dr-5320-mcfarland-dr-durham/3202127/menu-item/15544591396?menu-item-options=",
      restaurantName: "Clean Eatz",
      dishName: "Build a Bowl",
      service: "Grubhub",
    },
    {
      url: "https://www.doordash.com/store/farmside-kitchen-durham-1616801/58063946/?cursor=eyJzZWFyY2hfaXRlbV9jYXJvdXNlbF9jdXJzb3IiOnsicXVlcnkiOiJIZWFsdGh5IiwiaXRlbV9pZHMiOltdLCJzZWFyY2hfdGVybSI6ImhlYWx0aHkiLCJ2ZXJ0aWNhbF9pZCI6bnVsbCwidmVydGljYWxfbmFtZSI6IiIsInF1ZXJ5X2ludGVudCI6IkZPT0RfRElTSCJ9LCJzdG9yZV9wcmltYXJ5X3ZlcnRpY2FsX2lkcyI6WzEsNCwxMDAzMzIsMTAwMzMzLDE3NSwxNzYsMTc3LDE3OSwxOTMsMTk1XX0=&pickup=false",
      restaurantName: "Farmside Kitchen",
      dishName: "Farmbowl",
      service: "DoorDash",
    },
    {
      url: "https://www.doordash.com/store/will-and-well-salads-durham-30264587/40774146/?event_type=autocomplete&pickup=false",
      restaurantName: "Will and Well Salads",
      dishName: "BYO Bowl",
      service: "DoorDash",
    },
  ],
};

/**
 * Get a random meal delivery link for a specific dish
 * @param dishName - Name of the dish (e.g., "Mediterranean Bowl")
 * @param excludeUrls - Optional array of URLs to exclude (for skip functionality)
 * @returns A random meal delivery link
 */
export function getRandomMealDeliveryLink(
  dishName: string,
  excludeUrls: string[] = []
): MealDeliveryLink | null {
  const links = MEAL_DELIVERY_LINKS[dishName];
  if (!links || links.length === 0) return null;

  // Filter out excluded URLs
  const availableLinks = links.filter((link) => !excludeUrls.includes(link.url));

  if (availableLinks.length === 0) {
    // If all links have been excluded, reset and start fresh
    return links[Math.floor(Math.random() * links.length)];
  }

  // Return a random link from available options
  return availableLinks[Math.floor(Math.random() * availableLinks.length)];
}
