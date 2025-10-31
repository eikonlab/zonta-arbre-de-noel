// Configuration for message display templates
// Each template defines an SVG path and styling for animated message display

export const messageTemplates = [
  {
    id: 1,
    name: "Template 1",
    description: "Courbe descendante dynamique",
    path: "M0 585.5C327.988 558.475 496.276 666.723 620.031 389.5C739 123 1026.4 89.006 1280 82.5",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    primaryColor: "#2563eb",
    secondaryColor: "#764ba2",
  },
  {
    id: 2,
    name: "Template 2",
    description: "Vague montante",
    path: "M0 375.7C327.988 348.675 317.005 196.036 620.031 214.553C923.058 233.07 1026.4 622.425 1280 615.919",
    gradient: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
    primaryColor: "#764ba2",
    secondaryColor: "#667eea",
  },
  {
    id: 3,
    name: "Template 3",
    description: "Ondulations régulières",
    path: "M0 360C213 360 213 540 426.7 540C640 540 640 180 853.3 180C1066.7 180 1066.7 540 1280 540",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    primaryColor: "#f5576c",
    secondaryColor: "#f093fb",
  },
  {
    id: 4,
    name: "Template 4",
    description: "Double arc simple",
    path: "M0 180C320 180 320 540 640 540C960 540 960 180 1280 180",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    primaryColor: "#00f2fe",
    secondaryColor: "#4facfe",
  },
  {
    id: 5,
    name: "Template 5",
    description: "Spirale ascendante",
    path: "M0 600C200 600 200 400 400 400C600 400 600 200 800 200C1000 200 1000 100 1280 100",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    primaryColor: "#fa709a",
    secondaryColor: "#fee140",
  },
  {
    id: 6,
    name: "Template 6",
    description: "Zigzag harmonieux",
    path: "M0 360L213 180L426 540L640 180L853 540L1066 180L1280 360",
    gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    primaryColor: "#30cfd0",
    secondaryColor: "#330867",
  },
];

// Get a template by ID
export function getTemplateById(id) {
  return messageTemplates.find((t) => t.id === parseInt(id)) || messageTemplates[0];
}

// Get all available templates
export function getAllTemplates() {
  return messageTemplates;
}
