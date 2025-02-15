import type { AppProps } from 'next/app'
import {theme} from "theme/theme";
import {CssBaseline, ThemeProvider} from "@mui/material";
import {AuthProvider} from "lib/db/authcontext";
import {ShadowCanvas} from "components/global/shadowcanvas";
import LoginModal from "../components/global/loginmodal";
import FavIconHead from "../components/global/faviconhead";
import NoWgpuModal from "../components/global/nowgpumodal";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <AuthProvider>
        <ThemeProvider theme={theme}>
            <FavIconHead/>
            <ShadowCanvas/>
            <CssBaseline/>
            <LoginModal/>
            <NoWgpuModal/>
            <Component {...pageProps} />
        </ThemeProvider>
        </AuthProvider>
    )
}