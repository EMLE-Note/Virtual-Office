# WorkAdventure Map Starter Kit - Context for Qwen Code

## Project Overview

This is a starter kit for creating custom maps for [WorkAdventure](https://workadventu.re), a web-based collaborative workspace that allows users to create virtual office spaces. The project uses the Tiled map editor format (`.tmj` files) to define the map structure and integrates with WorkAdventure's scripting API for interactive features.

## Project Structure

```
.
├── .env                      # Environment configuration
├── .gitignore                # Git ignore patterns
├── index.html                # Main HTML entry point
├── package.json              # NPM package configuration
├── package-lock.json         # NPM lock file
├── README.md                 # Project documentation
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── office.tmj                # Main office map file (Tiled JSON format)
├── conference.tmj            # Conference room map file
├── emle-office.tmj           # EMLE office map file
├── emle-world.tmj            # EMLE world map file
├── office.png                # Office map thumbnail
├── conference.png            # Conference map thumbnail
├── src/                      # TypeScript source files
│   ├── main.ts               # Main entry point for scripts
│   └── features/             # Feature-specific scripts
│       ├── heartbeat.ts      # Heartbeat tracking feature
│       ├── roomLight.ts      # Room lighting feature
│       └── wave.ts           # Wave animation feature
├── public/                   # Static assets
│   └── images/               # Image assets (logos, icons, etc.)
├── tilesets/                 # Map tilesets (PNG images and TSX definitions)
└── LICENSE.*                 # Various license files
```

## Technologies Used

- **WorkAdventure**: The virtual collaboration platform
- **Tiled Map Editor**: Used to create and edit the `.tmj` map files
- **TypeScript**: For scripting interactive features
- **Vite**: Build tool and development server
- **Node.js**: Runtime environment

## Key Files

### Map Files (`.tmj`)
- `office.tmj`: Main office map with various rooms, meeting areas, and interactive zones
- `conference.tmj`: Conference room map that can be linked from the office
- `emle-office.tmj`: Specialized EMLE office map
- `emle-world.tmj`: EMLE world map

### Configuration Files
- `package.json`: Defines dependencies, scripts, and project metadata
- `vite.config.ts`: Vite build configuration with map optimization plugins
- `tsconfig.json`: TypeScript compiler options
- `.env`: Environment variables for configuration

### Script Files
- `src/main.ts`: Main entry point that initializes all features
- `src/features/roomLight.ts`: Controls lighting effects in meeting rooms
- `src/features/heartbeat.ts`: Tracks user presence and activity
- `src/features/wave.ts`: Animation effects

## Building and Running

### Prerequisites
- Node.js version >= 18

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Starts the development server with hot reloading.

### Production Build
```bash
npm run build
```
Creates an optimized production build in the `dist/` directory.

### Production Preview
```bash
npm run prod
```
Serves the production build locally for testing.

### Map Upload
```bash
npm run upload
```
Builds and uploads the map to WorkAdventure's hosting service.

## Map Structure

The maps are created using the Tiled map editor and follow a layered structure:

1. **Collision Layer**: Defines walkable and non-walkable areas
2. **Floor Layers**: Visual floor tiles
3. **Wall Layers**: Wall structures
4. **Furniture Layers**: Furniture and decorative elements
5. **Object Groups**: Interactive areas and zones (Jitsi meetings, silent zones, etc.)
6. **Above Layers**: Overhead elements like lighting effects

## Interactive Features

The map includes several interactive features implemented through TypeScript:

1. **Clock Popup**: Shows current time when player enters clock area
2. **Jitsi Meeting Rooms**: Integrated video conferencing areas
3. **Silent Zones**: Areas where players can work without audio distractions
4. **Room Lighting**: Automatic lighting that turns on when players enter rooms
5. **Heartbeat Tracking**: Tracks user presence and activity
6. **Map Navigation**: Links between office and conference maps

## Development Workflow

1. Edit maps using Tiled Map Editor
2. Add interactive features in `src/` directory
3. Test locally with `npm run dev`
4. Build for production with `npm run build`
5. Deploy using `npm run upload` or GitHub Pages

## Customization

To customize the map:
1. Modify the `.tmj` files using Tiled Map Editor
2. Add new tilesets in the `tilesets/` directory
3. Implement new features in the `src/features/` directory
4. Update `src/main.ts` to initialize new features
5. Add static assets to the `public/` directory

## Licensing

This project contains multiple licenses:
- Code license (LICENSE.code): MIT License
- Map license (LICENSE.map): CC-BY-SA 3.0
- Assets license (LICENSE.assets): Various licenses for tilesets