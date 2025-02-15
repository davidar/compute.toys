import ReplayIcon from "@mui/icons-material/Replay";
import {Button, SvgIcon} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {vimAtom} from "lib/atoms/atoms";
import { useAtom } from "jotai";

export const VimButton = () => {
    const [vim, setVim] = useAtom(vimAtom)
    const theme = useTheme();

    return(
        <Button onClick={() => { setVim(!vim) }} title={'Vim mode'} >
            <SvgIcon sx={{color: vim ? theme.palette.dracula.cyan : "#6c6c6c"}}>
                <path  style={{transform: "scale(1.33)"}} xmlns="http://www.w3.org/2000/svg" d="M7 1H1V4H2V14H5.74031L14 3.67539V1H8V4H9.43248L6 8.11898V4H7V1Z" />
            </SvgIcon>
        </Button>
    );
}

export default VimButton;
