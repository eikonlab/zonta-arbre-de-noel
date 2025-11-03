// Configuration for message display templates
// Each template defines an SVG path and styling for animated message display

export const messageTemplates = [
  {
    id: 1,
    name: "Template 1",
    description: "Courbe descendante dynamique",
    path: "M0 585.5C327.988 558.475 496.276 666.723 620.031 389.5C739 123 1026.4 89.006 1280 82.5",
  },
  {
    id: 2,
    name: "Template 2",
    description: "Vague montante",
    path: "M0 375.7C327.988 348.675 317.005 196.036 620.031 214.553C923.058 233.07 1026.4 622.425 1280 615.919",
  },
  {
    id: 3,
    name: "Template 3",
    description: "Ondulations régulières",
    path: "M0 360C213 360 213 540 426.7 540C640 540 640 180 853.3 180C1066.7 180 1066.7 540 1280 540",
  },
  {
    id: 4,
    name: "Template 4",
    description: "Double arc simple",
    path: "M0 180C320 180 320 540 640 540C960 540 960 180 1280 180",
  },
  {
    id: 5,
    name: "Template 5",
    description: "Spirale ascendante",
    path: "M0 600C200 600 200 400 400 400C600 400 600 200 800 200C1000 200 1000 100 1280 100",
  },
  {
    id: 6,
    name: "Template 6",
    description: "Zigzag harmonieux",
    path: "M0 360L213 180L426 540L640 180L853 540L1066 180L1280 360",
  },
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
