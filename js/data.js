// Workflow definition: 5 stages per reel, 13 BizBuddy reels + 10 Indian Digital Ads reels.
window.IDA = window.IDA || {};

IDA.STAGES = [
  "Prompt Creation",
  "Scene Creation",
  "Google Flow Video Generation",
  "Editing",
  "Final Upload"
];

IDA.BRANDS = {
  bizbuddy: {
    label: "BizBuddy",
    title: "BIZBUDDY REELS",
    reels: [
      "Are You Selling the Right Product?",
      "Who Is Your Ideal Customer?",
      "Why Should Customers Choose You?",
      "Are You Pricing Your Product Correctly?",
      "Quality vs Cost",
      "Packaging Is More Than a Box",
      "Don't Launch Without Testing",
      "Know Your Competition",
      "Your Product Must Evolve",
      "Too Many Choices Can Confuse Customers",
      "Is It the Right Time to Launch?",
      "Can Customers Understand Your Value?",
      "Can Your Product Scale?"
    ]
  },
  ida: {
    label: "Indian Digital Ads",
    title: "INDIAN DIGITAL ADS REELS",
    reels: [
      "Jewellery & Luxury",
      "Skincare & Beauty",
      "Fashion & Apparel",
      "Restaurants & Cafes",
      "Real Estate & Property Developers",
      "Fitness & Gym",
      "Perfume & Fragrance",
      "Bakery, Sweets & Food",
      "Hotels, Resorts & Hospitality",
      "Interior Design & Furniture"
    ]
  }
};

IDA.ALL_REELS = Object.entries(IDA.BRANDS).flatMap(([brand, b]) =>
  b.reels.map((name, index) => ({ id: `${brand}-${index + 1}`, brand, name, index }))
);
IDA.TOTAL_REELS = IDA.ALL_REELS.length;                       // 23
IDA.TOTAL_STAGES = IDA.TOTAL_REELS * IDA.STAGES.length;       // 115
