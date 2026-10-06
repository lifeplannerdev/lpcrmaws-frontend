import { createTheme } from '@mui/material/styles';

// MUI theme aligned with the CRM palette (indigo-600 / purple-600, rounded-xl surfaces)
export const mailTheme = createTheme({
  palette: {
    primary: { main: '#4f46e5', dark: '#4338ca', light: '#818cf8' },
    secondary: { main: '#7c3aed' },
    error: { main: '#dc2626' },
    warning: { main: '#d97706' },
    success: { main: '#16a34a' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'inherit',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, paddingInline: 16 },
        containedPrimary: {
          background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
          '&:hover': { background: 'linear-gradient(90deg, #4338ca, #6d28d9)' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 12, backgroundColor: '#fff' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: '0 25px 50px -12px rgba(15,23,42,.35)' },
      },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)' } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: '#4b5563', backgroundColor: '#f8fafc', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' },
      },
    },
    MuiSwitch: {},
  },
});

export default mailTheme;
