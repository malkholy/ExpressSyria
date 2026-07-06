# Express Panel

Express Panel Control Panel — GLC Paints  
Built with React JSX · Hosted on GitHub Pages

## Live
https://malkholy.github.io/expresspanel/

## API
`https://express-syria.glcpaints.com:7779/General/GeneralAPI/`  
SP: `APIPanelOperation`

## Pages
| Page | Operation | Status |
|------|-----------|--------|
| Control Page | `Get Control Data` | 🔄 In progress |
| Expenses | TBD | ⏳ Pending |
| Projects | TBD | ⏳ Pending |
| HR | TBD | ⏳ Pending |
| Cash | TBD | ⏳ Pending |

## Structure
```
src/
├── App.jsx          ← Login + Layout + Sidebar + Tabs
├── nav.js           ← Nav config
├── shared/
│   └── api.js       ← apiCall helper
└── pages/
    ├── ControlPage.jsx
    ├── Expenses.jsx
    ├── Projects.jsx
    ├── HR.jsx
    └── Cash.jsx
```
