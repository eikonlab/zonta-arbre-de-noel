// Configuration for message display templates
// Each template defines an SVG path and styling for animated message display

export const messageTemplates = [
  {
    id: 1,
    path: "M0,229.48c139.05,95.26,347.99,211.23,621.03,273.29,620.35,140.99,1131.17-96.41,1298.97-183.68",
    width: 1920,
    height: 1200,
  },
  {
    id: 2,
    path: "M0,458.23c161.46-44.73,408.47-85.21,767.67-54.99,359.2,30.22,685.78,214.96,832.33,312.9",
    width: 1600,
    height: 900,
  },
  {
    id: 3,
    path: "M0,275.84c218.4,73.98,624.03,175.42,1108.09,79.79,196.17-38.75,361.27-101.18,491.91-163.54",
    width: 1600,
    height: 900,
  },
  {
    id: 4,
    path: "M0,100.07c314.13,268.23,519.65,347.69,959.67,383.55,472.8,38.54,959.58-130.07,960.32-142.3",
    width: 1920,
    height: 1200,
  },
  {
    id: 5,
    path: "M0,441.74c34.03-17.37,386.59-184.51,888.11-176.09,552.7,9.28,900.87,216.69,1031.9,289.8",
    width: 1920,
    height: 1200,
  }
];

// Array of colors for messages
export const messageColors = [
  "#AE5C1A",
  "#DF8507",
  "#E07517",
  "#F56E00",
  "#FF9337",
  "#FDBC2E",
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
