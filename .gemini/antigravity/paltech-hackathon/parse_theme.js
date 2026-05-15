const colors = {
    "primary": "#000000",
    "outline": "#76777d",
    "error": "#ba1a1a",
    "surface-container-lowest": "#ffffff",
    "on-error-container": "#93000a",
    "on-secondary": "#ffffff",
    "inverse-primary": "#bec6e0",
    "surface-container-highest": "#e0e3e5",
    "on-tertiary-container": "#98805d",
    "tertiary-fixed-dim": "#dec29a",
    "secondary-container": "#2170e4",
    "on-primary-container": "#7c839b",
    "background": "#f7f9fb",
    "surface-variant": "#e0e3e5",
    "tertiary": "#000000",
    "on-secondary-fixed-variant": "#004395",
    "inverse-on-surface": "#eff1f3",
    "surface": "#f7f9fb",
    "primary-fixed": "#dae2fd",
    "on-primary-fixed": "#131b2e",
    "primary-container": "#131b2e",
    "on-error": "#ffffff",
    "surface-container-high": "#e6e8ea",
    "on-background": "#191c1e",
    "error-container": "#ffdad6",
    "on-tertiary": "#ffffff",
    "on-surface-variant": "#45464d",
    "secondary": "#0058be",
    "primary-fixed-dim": "#bec6e0",
    "on-primary-fixed-variant": "#3f465c",
    "secondary-fixed-dim": "#adc6ff",
    "on-tertiary-fixed": "#271901",
    "secondary-fixed": "#d8e2ff",
    "on-secondary-fixed": "#001a42",
    "surface-tint": "#565e74",
    "surface-container-low": "#f2f4f6",
    "on-primary": "#ffffff",
    "on-secondary-container": "#fefcff",
    "tertiary-fixed": "#fcdeb5",
    "tertiary-container": "#271901",
    "surface-bright": "#f7f9fb",
    "surface-container": "#eceef0",
    "on-surface": "#191c1e",
    "inverse-surface": "#2d3133",
    "outline-variant": "#c6c6cd",
    "surface-dim": "#d8dadc",
    "on-tertiary-fixed-variant": "#574425"
};

const fs = require('fs');

let css = ':root {\n';
for (const [key, value] of Object.entries(colors)) {
    css += `  --color-${key}: ${value};\n`;
}
css += '}\n\nhtml.dark {\n';

// Simple dark mode invert
const darkColors = {
    "primary": "#ffffff",
    "outline": "#909298",
    "error": "#ffb4ab",
    "surface-container-lowest": "#0f1011",
    "on-error-container": "#ffdad6",
    "on-secondary": "#002a5e",
    "inverse-primary": "#40485d",
    "surface-container-highest": "#36383a",
    "on-tertiary-container": "#ffdea7",
    "tertiary-fixed-dim": "#dec29a",
    "secondary-container": "#00408f",
    "on-primary-container": "#dae2fd",
    "background": "#121212",
    "surface-variant": "#44474e",
    "tertiary": "#ffffff",
    "on-secondary-fixed-variant": "#b1c5ff",
    "inverse-on-surface": "#191c1e",
    "surface": "#121212",
    "primary-fixed": "#dae2fd",
    "on-primary-fixed": "#001944",
    "primary-container": "#00408f",
    "on-error": "#690005",
    "surface-container-high": "#2b2d2f",
    "on-background": "#e1e3e4",
    "error-container": "#93000a",
    "on-tertiary": "#422c00",
    "on-surface-variant": "#c4c6cf",
    "secondary": "#adc6ff",
    "primary-fixed-dim": "#bec6e0",
    "on-primary-fixed-variant": "#bec6e0",
    "secondary-fixed-dim": "#adc6ff",
    "on-tertiary-fixed": "#271901",
    "secondary-fixed": "#d8e2ff",
    "on-secondary-fixed": "#001a42",
    "surface-tint": "#b1c5ff",
    "surface-container-low": "#1a1c1e",
    "on-primary": "#002a5e",
    "on-secondary-container": "#d8e2ff",
    "tertiary-fixed": "#fcdeb5",
    "tertiary-container": "#5a4119",
    "surface-bright": "#383a3c",
    "surface-container": "#1e2022",
    "on-surface": "#e1e3e4",
    "inverse-surface": "#e1e3e4",
    "outline-variant": "#44474e",
    "surface-dim": "#121212",
    "on-tertiary-fixed-variant": "#574425"
};

for (const [key, value] of Object.entries(darkColors)) {
    css += `  --color-${key}: ${value};\n`;
}
css += '}\n';

fs.writeFileSync('public/theme.css', css);

let js = `tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {\n`;
for (const key of Object.keys(colors)) {
    js += `        "${key}": "var(--color-${key})",\n`;
}
js += `      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "xl": "32px",
        "sm": "12px",
        "md": "16px",
        "xs": "4px",
        "margin-mobile": "20px",
        "gutter-mobile": "16px",
        "base": "8px",
        "lg": "24px"
      },
      fontFamily: {
        "body-sm": ["Manrope"],
        "headline-sm": ["Manrope"],
        "body-lg": ["Manrope"],
        "headline-lg-mobile": ["Manrope"],
        "body-md": ["Manrope"],
        "label-md": ["Manrope"],
        "label-sm": ["Manrope"],
        "headline-lg": ["Manrope"],
        "headline-md": ["Manrope"]
      },
      fontSize: {
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "headline-sm": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}],
        "headline-lg-mobile": ["28px", {"lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.02em", "fontWeight": "600"}],
        "label-sm": ["12px", {"lineHeight": "16px", "letterSpacing": "0.04em", "fontWeight": "500"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "headline-md": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600"}]
      }
    }
  }
};`;

fs.writeFileSync('public/theme.js', js);
