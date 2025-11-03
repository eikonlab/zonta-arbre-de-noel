// Configuration for message display templates
// Each template defines an SVG path and styling for animated message display

export const messageTemplates = [
  {
    id: 1,
    path: "M0 585 Q640 200 1280 82",
  },
  {
    id: 2,
    path: "M0 375 Q640 200 1280 615",
  },
  {
    id: 3,
    path: "M0 360 Q426 540 853 180 Q1066 360 1280 540",
  },
  {
    id: 4,
    path: "M0 180 Q640 540 1280 180",
  }
];

// Array of colors for messages
export const messageColors = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#9333ea", // Purple
  "#ea580c", // Orange
];

// Get a random color from the array
export function getRandomColor() {
  return messageColors[Math.floor(Math.random() * messageColors.length)];
}

// Get a template by ID
export function getTemplateById(id) {
  return messageTemplates.find((t) => t.id === parseInt(id)) || messageTemplates[0];
}

// Get all available templates
export function getAllTemplates() {
  return messageTemplates;
}
