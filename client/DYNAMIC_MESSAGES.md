# Dynamic Message View System

## Overview

The Message View now uses a dynamic routing system that allows you to display messages along different SVG paths. Instead of having separate components for each template, there's one unified `MessageView.vue` component that accepts a route parameter to determine which SVG path to use.

## URL Structure

```
/message/:id
```

### Examples:

- `/message/1` - Template 1 (Courbe descendante dynamique)
- `/message/2` - Template 2 (Vague montante)
- `/message/3` - Template 3 (Ondulations régulières)
- `/message/4` - Template 4 (Double arc simple)
- `/message/5` - Template 5 (Spirale ascendante)
- `/message/6` - Template 6 (Zigzag harmonieux)

## File Structure

### Core Files

```
client/src/
├── views/
│   ├── MessageView.vue         # Dynamic message display component
│   ├── Message1.vue            # [Can be removed - legacy]
│   └── Message2.vue            # [Can be removed - legacy]
├── config/
│   └── messageTemplates.js     # SVG path configurations
└── router/
    └── index.js                # Updated with dynamic route
```

## Adding New Templates

To add a new SVG path template, edit `client/src/config/messageTemplates.js`:

```javascript
export const messageTemplates = [
  // ... existing templates
  {
    id: 7, // Unique ID
    name: "Template 7", // Display name
    description: "Your description",
    path: "M0 360L1280 360", // SVG path data
  },
];
```

### Path Properties:

- **id**: Unique numeric identifier (used in URL)
- **name**: Display name shown in template switcher
- **description**: Brief description of the path style
- **path**: SVG path data (d attribute)

### Message Colors:

Messages are displayed in random colors from a predefined palette. To customize the color palette, edit the `messageColors` array in `messageTemplates.js`:

```javascript
export const messageColors = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#9333ea", // Purple
  "#ea580c", // Orange
];
```

Each message receives a random color from this array when it's displayed.

## Features

### ✨ Dynamic Routing

- Single component handles all templates
- Clean URL structure: `/message/:id`
- Easy to add new templates without creating new components

### 🎨 Template Switcher

- Built-in navigation between templates
- Visual indicator for active template
- Responsive design

### 🔄 Real-time Updates

- Socket.io integration for live message updates
- Automatic message rotation
- Countdown timer for next message

### 📱 Responsive Design

- Works on desktop, tablet, and mobile
- Adaptive font sizes
- Touch-friendly navigation

## Configuration Options

### Animation Settings

In `MessageView.vue`, you can adjust:

```javascript
const animationDuration = 10; // seconds for text to travel across path
```

### Template Configuration

Each template in `messageTemplates.js` supports:

- Custom SVG paths
- Unique styling

Message colors are randomly assigned from the `messageColors` array, ensuring visual variety regardless of the template used.

## Migrating from Old System

### Before (Multiple Components):

```javascript
// router/index.js
import Message1 from "../views/Message1.vue";
import Message2 from "../views/Message2.vue";

routes: [
  { path: "/message/1", component: Message1 },
  { path: "/message/2", component: Message2 },
];
```

### After (Single Dynamic Component):

```javascript
// router/index.js
import MessageView from "../views/MessageView.vue";

routes: [{ path: "/message/:id", component: MessageView, props: true }];
```

## Benefits

1. **Maintainability**: One component to maintain instead of multiple
2. **Scalability**: Add new templates by editing config, not creating new components
3. **Consistency**: All templates share the same logic and features
4. **Clean URLs**: RESTful URL structure
5. **Easy Configuration**: Centralized template configuration

## Example: Creating a Custom Path

1. Open `client/src/config/messageTemplates.js`
2. Add a new template object:

```javascript
{
  id: 8,
  name: "Wave Pattern",
  description: "Smooth sine wave",
  path: "M0 360 Q 320 180 640 360 T 1280 360",
}
```

3. Access it at `/message/8`

## Testing

Test your new template by:

1. Navigating to `/message/{id}`
2. Checking that the SVG path renders correctly
3. Verifying colors match your configuration
4. Testing on different screen sizes
5. Ensuring message animation works smoothly

## Cleanup

You can safely delete these legacy files:

- `client/src/views/Message1.vue`
- `client/src/views/Message2.vue`

The new `MessageView.vue` handles all template rendering.
