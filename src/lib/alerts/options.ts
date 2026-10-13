// Choices shared by the agent's "Set Up a Client Search" flow and the client's
// own "Adjust your search" page, so the two never drift apart.

export const PRICES: [string, string][] = [
  ["", "No limit"], ["50000", "$50,000"], ["75000", "$75,000"], ["100000", "$100,000"], ["125000", "$125,000"],
  ["150000", "$150,000"], ["175000", "$175,000"], ["200000", "$200,000"], ["250000", "$250,000"], ["300000", "$300,000"],
  ["350000", "$350,000"], ["400000", "$400,000"], ["500000", "$500,000"], ["600000", "$600,000"], ["750000", "$750,000"], ["1000000", "$1,000,000"],
];
export const TYPES: [string, string][] = [
  ["", "Any home"], ["Single Family", "Single family"], ["New Construction", "New construction"],
  ["Multi-Family", "Multi-family"], ["Land", "Land"], ["Mobile / Manufactured", "Mobile / manufactured"],
];
export const MUST_HAVES: [string, string][] = [
  ["pool", "Pool"], ["acre_plus", "1+ acre"], ["waterfront", "Waterfront"], ["single_story", "Single story"],
  ["garage", "Garage"], ["shop", "Shop"], ["fireplace", "Fireplace"], ["updated", "Updated / remodeled"],
];
