
# AR Measure

A minimalist Augmented Reality (AR) measuring application that allows users to measure real-world distances between two selected points using their smartphone camera.

## Overview

AR Measure transforms your smartphone into a simple measuring tool using augmented reality.

Instead of using a physical ruler or measuring tape, users can select two points in their surroundings and view the calculated distance between them.

The application is designed with a clean, minimal interface and a straightforward measurement experience.

## Features

- **AR Point Selection** – Select two points in your real-world environment.
- **Distance Measurement** – Calculate the straight-line distance between two AR points.
- **Live Camera View** – View your surroundings while placing measurement points.
- **Visual Measurement Line** – See a line connecting the selected points.
- **AR Tracking** – Keep measurement markers visually aligned with the environment.
- **Measurement Reset** – Clear existing points and start a new measurement.
- **Minimal Interface** – Clean and simple user experience.
- **Android Support** – Available as an installable Android APK.


## How It Works

AR Measure uses augmented reality to identify two locations in the physical environment and calculate the distance between them.

### Measurement Process

1. Launch AR Measure.
2. Allow camera access when prompted.
3. Point your device towards the desired starting location.
4. Select the first AR point.
5. Move your device towards the ending location.
6. Select the second AR point.
7. The application calculates the distance between both points.
8. View the measurement and connecting line on the screen.

## Distance Calculation

The application uses the 3D Euclidean distance formula to calculate the distance between two spatial coordinates.

For two points:

- A = (x₁, y₁, z₁)
- B = (x₂, y₂, z₂)

The distance is calculated using:

```text
d = √((x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²)
```

The calculated result represents the straight-line distance between the two selected points in 3D space.

## Architecture

AR Measure follows a modular architecture consisting of the user interface, camera input, AR tracking, point selection, distance calculation and visual rendering.

```text
              USER
                |
                v
        REACT USER INTERFACE
                |
        +-------+-------+
        |               |
        v               v
    CAMERA INPUT    USER INPUT
        |               |
        v               |
     AR TRACKING        |
        |               |
        +-------+-------+
                |
                v
         POINT SELECTION
                |
                v
         3D COORDINATES
                |
                v
      DISTANCE CALCULATION
                |
                v
        VISUAL RENDERING
                |
                v
      MEASUREMENT RESULT
```

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| TypeScript | Type-safe development |
| Vite | Build tooling |
| Tailwind CSS | Styling |
| Capacitor | Android application packaging |
| Lucide React | Interface icons |
| Motion | UI animations |

## Installation

### Download APK

AR Measure is distributed as an Android APK.

Download the latest version from either of the following sources:

- **Official Website:** [sajandhl.qzz.io](https://sajandhl.qzz.io)
- **GitHub Releases:** [Download Latest Release](https://github.com/venchy-np/ar-measure/releases)

### Install on Android

1. Visit the official download website or GitHub Releases.
2. Download the latest AR Measure APK.
3. Open the downloaded APK on your Android device.
4. Follow the installation instructions.
5. Launch AR Measure.
6. Grant camera permission when prompted.

**Note:** AR functionality requires a compatible Android device with supported AR capabilities.

## Platform Support

| Platform | Availability |
|---|---|
| Android | APK download |
| Desktop | Not supported |

## Accuracy and Limitations

Measurement accuracy depends on several factors:

- Device AR tracking capabilities.
- Camera quality and environmental lighting.
- Visibility of surfaces and environmental features.
- Stability of the device while measuring.
- Accuracy of selected measurement points.

AR measurements are estimates and should not replace calibrated measuring instruments for precision-critical applications.

## Future Improvements

- Measurement history.
- Multiple measurement support.
- Improved point-placement feedback.
- Additional measurement units.
- Better tracking recovery.
- Object and surface measurement capabilities.


Yes, Its Vibe coded.