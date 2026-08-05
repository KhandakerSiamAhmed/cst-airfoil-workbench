# CST Airfoil Workbench

A browser application for interactive airfoil geometry design using the Class-Shape Transformation (CST) parameterization method.

**Live application:** [https://khandakersiamahmed.github.io/cst-airfoil-workbench/](https://khandakersiamahmed.github.io/cst-airfoil-workbench/)

## How to use

Open the live application link in a web browser, or open `index.html` locally. The application runs entirely in the browser and requires no installation or server.

## Features

- Control Class function variables (N1, N2) and Shape function variables (order and surface weights).
- Switch between direct upper/lower surface generation and Thickness/Camber (ST/SC) modes.
- Apply geometry constraints such as locked leading-edge radius or trailing-edge gaps.
- Import existing airfoil coordinates from `.dat` or `.txt` files to analyze or match their shapes.
- Export your generated airfoil geometries to `.dat`, `.csv`, `.dxf`, or `.sldcrv` formats.
- Inspect the resulting shapes through visual plots of the geometry, derivatives, and fit residuals, alongside a table of coordinates.

## User Interface

- **Top Bar:** Load predefined shapes (like NACA 4-digit series), import files, and export the current design.
- **Left Dock:** Contains sliders and inputs for all CST variables and constraints. 
- **Main Viewport:** Provides a plot of the geometry. Use the zoom controls in the corner to inspect specific areas.
- **Bottom Tabs:** Switch the main view between the primary geometry plot, slopes and curvature, residuals, and the raw coordinate data table.
- **Bottom HUD:** Displays live aerodynamic characteristics like thickness-to-chord ratio (t/c), camber (h/c), leading-edge radius (R_LE), and trailing-edge angles (Beta).
