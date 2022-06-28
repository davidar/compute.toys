// MUI sizing from refs:
// https://github.com/mui/material-ui/issues/15662

import Monaco from 'components/editor/monaco';
import {WgpuToyWrapper} from "components/wgputoy";

import {useCallback} from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import PlayPauseButton from "components/buttons/playpausebutton"
import ResetButton from "components/buttons/resetbutton";
import HotReloadToggle from "components/buttons/hotreloadtoggle";
import ReloadButton from "components/buttons/reloadbutton";
import ScaleButton from 'components/buttons/scalebutton';
import FullscreenButton from "../../components/buttons/fullscreenbutton";

import {Frame} from "theme/theme";

import "firacode";

import UniformSliders from "components/editor/uniformsliders";
import TexturePicker from "components/editor/texturepicker";
import EntryPointDisplay from "components/editor/entrypointdisplay";
import {canvasParentElAtom} from "lib/atoms/wgputoyatoms";
import {useUpdateAtom} from "jotai/utils";
import {MetadataEditor} from "components/editor/metadataeditor";
import {useDBRouter} from "lib/db/dbrouter";
import {saveColorTransitionSignalAtom} from "lib/atoms/atoms";
import { ItemWithTransitionSignal } from 'theme/itemwithtransition';
import Explainer from "../../components/editor/explainer";
import ConfigurationPicker from "../../components/editor/configurationpicker";
import dynamic from "next/dynamic";


const Index = () => {

    const setCanvasParentEl = useUpdateAtom(canvasParentElAtom);

    const renderParentNodeRef = useCallback((parent) => {
        if (parent) {
            setCanvasParentEl(parent);
        }
    }, []);
    
    const Timer = dynamic(() => import('components/timer'), {ssr: false});

    useDBRouter();

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={2}>
                <Grid item ref={renderParentNodeRef} xs={3} md={4} lg={5} xl={6}>
                    <ItemWithTransitionSignal transitionAtom={saveColorTransitionSignalAtom}>
                        <Frame elevation={12}>
                            <WgpuToyWrapper
                                bindID={"editor-canvas"}
                                style={{
                                    display: 'inline-block',
                                    borderRadius: '4px'
                                }}
                            />
                        </Frame>
                        <Grid container>
                            <Grid item sx={{textAlign: 'left'}} xs={2}>
                                <Timer />
                            </Grid>
                            <Grid item xs={8}>
                                <PlayPauseButton />
                                <ResetButton />
                            </Grid>
                            <Grid item sx={{textAlign: 'right'}} xs={2}>
                                <ScaleButton />
                                <FullscreenButton />
                            </Grid>
                        </Grid>
                        <UniformSliders/>
                    </ItemWithTransitionSignal>
                    <ItemWithTransitionSignal sx={{textAlign: "left", marginTop: "20px"}} transitionAtom={saveColorTransitionSignalAtom}>
                        <MetadataEditor/>
                    </ItemWithTransitionSignal>
                </Grid>
                <Grid item xs={9} md={8} lg={7} xl={6}>
                    <ItemWithTransitionSignal transitionAtom={saveColorTransitionSignalAtom}>
                        <Monaco
                            editorOptions={{
                                stopRenderingLineAfter: 1000,
                                fontFamily: "'Fira Code', monospace",
                                'bracketPairColorization.enabled': true,
                                //fontLigatures: true,
                            }}
                        />
                        <Box sx={{paddingTop: "4px"}}>
                            <ReloadButton/>
                            <HotReloadToggle/>
                            <Explainer/>
                        </Box>
                    </ItemWithTransitionSignal>
                    <Grid container spacing={2}>
                        <Grid item><TexturePicker/></Grid>
                        <Grid item><ConfigurationPicker/></Grid>
                        <Grid item><EntryPointDisplay/></Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Index;