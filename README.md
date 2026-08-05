# CST Airfoil Workbench

A client-side single-page application for interactively designing airfoil geometry using the Class-Shape Transformation (CST) parameterization method.

## How to open it

Simply open the `index.html` file in any modern web browser. No local web server or build process is required for the application to function.
- On Windows: Double click `index.html` or drag it into Chrome/Edge/Firefox.

## How to run the test scripts

The project includes two self-verification scripts in the `test/` folder that require Node.js.

### Analytical Math Validation
1. Ensure Node.js is installed.
2. Open a terminal in the project root.
3. Run:
   ```bash
   node test/validate-math.mjs
   ```
   This will run the internal least-squares fitter against the exact NACA 0012 analytical thickness formula and assert numerical bounds on geometry and derivatives.

### Graphical UI Validation
1. Ensure Node.js is installed.
2. Initialize the project and install Playwright (required once):
   ```bash
   npm init -y
   npm install -D playwright
   ```
3. Run:
   ```bash
   node test/validate-ui.mjs
   ```
   This headless test will load the app, verify there are no console errors, check Plotly initialization, interact with sliders, and save visual verification screenshots (`verification_custom.png` and `verification_naca0012.png`).
