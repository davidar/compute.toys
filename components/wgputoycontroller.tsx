import {useCallback, useEffect} from "react";
import {atom, useAtom, useAtomValue} from "jotai";
import {
    codeAtom, dbLoadedAtom, entryPointsAtom,
    hotReloadAtom,
    loadedTexturesAtom,
    manualReloadAtom,
    parseErrorAtom,
    playAtom, requestFullscreenAtom,
    resetAtom, sliderRefMapAtom, sliderSerDeNeedsUpdateAtom, sliderUpdateSignalAtom
} from "lib/atoms/atoms";
import {useUpdateAtom} from "jotai/utils";
import {
    canvasElAtom,
    canvasParentElAtom,
    safeContext,
    safeContextWithCanvas,
    wgputoyAtom
} from "lib/atoms/wgputoyatoms";
import {useTransientAtom} from "jotai-game";
import useResizeObserver from "@react-hook/resize-observer";
import {getDimensions} from "types/canvasdimensions";

const requestAnimationFrameIDAtom = atom(0);
const widthAtom = atom(0);
const isPlayingAtom = atom(false);

/*
    Controller component. Returns null because we expect to be notified
    when a new canvas element is rendered to the DOM by a parent node
    (or elsewhere).

    Note that "exhaustive deps" are deliberately not used in effect hooks
    here, because they will fire off additional effects unnecessarily.
 */
const WgpuToyController = (props) => {

    const [play, setPlay] = useAtom(playAtom);
    const [reset, setReset] = useAtom(resetAtom);
    const hotReload = useAtomValue(hotReloadAtom);

    // must be transient so we can access updated value in play loop
    const [sliderUpdateSignal, setSliderUpdateSignal] = useTransientAtom(sliderUpdateSignalAtom);
    const [manualReload, setManualReload] = useTransientAtom(manualReloadAtom);
    const [isPlaying, setIsPlaying] = useTransientAtom(isPlayingAtom);
    const [codeHot,] = useTransientAtom(codeAtom);
    const [dbLoaded,] = useTransientAtom(dbLoadedAtom);
    // transient atom can't be used with effect hook, and we want both
    // "hot" access and effect hook access
    const code = useAtomValue(codeAtom);

    const setParseError = useUpdateAtom(parseErrorAtom);
    const loadedTextures = useAtomValue(loadedTexturesAtom);
    const setEntryPoints = useUpdateAtom(entryPointsAtom);

    const wgputoy = useAtomValue(wgputoyAtom);
    const canvas = useAtomValue(canvasElAtom);

    const parentRef = useAtomValue<HTMLElement | null>(canvasParentElAtom);

    const [width, setWidth] = useTransientAtom(widthAtom);
    const [requestAnimationFrameID, setRequestAnimationFrameID] = useTransientAtom(requestAnimationFrameIDAtom);
    const sliderRefMap = useAtomValue(sliderRefMapAtom);

    const [requestFullscreenSignal, setRequestFullscreenSignal] = useAtom(requestFullscreenAtom);

    const updateUniforms = useCallback(() => {
        safeContext(wgputoy, (wgputoy) => {
            if (sliderRefMap) {
                let names: string[] = [];
                let values: number[] = [];
                [...sliderRefMap.keys()].map(uuid => {
                    if (sliderRefMap.get(uuid)) {
                        names.push(sliderRefMap.get(uuid).current.getUniform());
                        values.push(sliderRefMap.get(uuid).current.getVal());
                    }
                }, this);
                if (names.length > 0) wgputoy.set_custom_floats(names, Float32Array.from(values));
            }
        });
    }, []);

    const playCallback = useCallback((time: DOMHighResTimeStamp) => {
        safeContext(wgputoy, (wgputoy) => {
            if (sliderUpdateSignal()) {
                updateUniforms();
            }
            /*
                Handle manual reload in the play callback to handle race conditions
                where manualReload gets set before the controller is loaded, which
                results in the effect hook for manualReload never getting called.

                Seems to be safe to do this for slider updates, wgpu appears to cache
                builds if they're unchanged.
             */
            if ((manualReload() && dbLoaded()) || (sliderUpdateSignal() && dbLoaded())) {
                reloadCallback();
                setManualReload(false);
                setSliderUpdateSignal(false);
            }
            wgputoy.set_time_elapsed(time * 1e-3);
            wgputoy.render();
            setIsPlaying(true);
            setRequestAnimationFrameID(requestAnimationFrame(playCallback));
        });
    }, []);

    const pauseCallback = useCallback(() => {
        setIsPlaying(false);
        cancelAnimationFrame(requestAnimationFrameID());
    }, []);

    const resetCallback = useCallback(() => {
        safeContext(wgputoy, (wgputoy) => {
            const dimensions = getDimensions(parentRef.offsetWidth); //theoretically dangerous call?
            setWidth(dimensions.x);
            wgputoy.reset();
        });
    }, []);

    const handleSuccess = useCallback((entryPoints) => {
        setEntryPoints(entryPoints);
        setParseError(error => ({
            summary: "",
            position: {row: 0, col: 0},
            success: true
        }));
    }, []);

    const handleError = useCallback((summary, row, col) => {
        setParseError(error => ({
            summary: summary,
            position: {row: Number(row), col: Number(col)},
            success: false
        }));
    }, []);

    const loadTexture = useCallback((index: number, uri: string) => {
        safeContext(wgputoy, (wgputoy) => {
            fetch(uri).then(
                response => {
                    if (!response.ok) {
                        throw new Error('Failed to load image');
                    }
                    return response.blob();
                }).then(b => b.arrayBuffer()).then(
                data => {
                    if (uri.match(/\.hdr/i)) {
                        wgputoy.load_channel_hdr(index, new Uint8Array(data))
                    } else {
                        wgputoy.load_channel(index, new Uint8Array(data))
                    }
                }
            ).catch(error => console.error(error));
        });
    }, []);

    const reloadCallback = useCallback( () => {
        safeContext(wgputoy, (wgputoy) => {
            wgputoy.set_shader(codeHot());
        });
    }, []);

    const requestFullscreen = useCallback( () => {
        safeContextWithCanvas(wgputoy, canvas, (wgputoy, canvas) => {
            if (!document.fullscreenElement) {
                canvas.requestFullscreen({navigationUI: "hide"});
            }
        });
    }, []);

    // init effect
    useEffect(() => {

        props.onLoad();

        const handleKeyDown = (e) => {
            safeContext(wgputoy, (wgputoy) => {
                if (typeof(e.keyCode) === 'number') wgputoy.set_keydown(e.keyCode, true);
            });
        }

        const handleKeyUp = (e) => {
            safeContext(wgputoy, (wgputoy) => {
                if (typeof(e.keyCode) === 'number') wgputoy.set_keydown(e.keyCode, false);
            });
        }

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        safeContextWithCanvas(wgputoy, canvas, (wgputoy, canvas) => {
                const handleMouseMove = (e: MouseEvent) => {
                    wgputoy.set_mouse_pos(e.offsetX, e.offsetY)
                }

                const handleMouseUp = (e: MouseEvent) => {
                    wgputoy.set_mouse_click(false);
                    canvas.onmousemove = null;
                }

                const handleMouseDown = (e: MouseEvent) => {
                    wgputoy.set_mouse_click(true);
                    canvas.onmousemove = handleMouseMove;
                }

                canvas.onmousedown = handleMouseDown;
                canvas.onmouseup = handleMouseUp;
                canvas.onmouseleave = handleMouseUp;

                wgputoy.on_success(handleSuccess);
                wgputoy.on_error(handleError);
        });

        if (!isPlaying()) {
            setPlay(true);
            resetCallback();
            playCallback(0);
        }

        // Return a pauseCallback for the cleanup lifecycle
        return pauseCallback;
    }, []);

    useEffect(() => {
        if (play && !isPlaying()) {
            playCallback(0);
        } else if (!play && isPlaying()) {
            pauseCallback();
        }
    }, [play, isPlaying()])

    useEffect(() => {
        /*
            only need to handle manual reload effect here for
            special case where we're paused and a reload is called
        */
        if (hotReload || (!isPlaying() && manualReload())) {
            reloadCallback();
            setManualReload(false);
        }
    }, [code, hotReload, manualReload()]);

    const updateResolution = () => {
        safeContext(wgputoy, (wgputoy) => {
            let dimensions = {x: 0, y: 0}; // dimensions in device (physical) pixels
            if (document.fullscreenElement) {
                // calculate actual screen resolution, accounting for both zoom and hidpi
                // https://stackoverflow.com/a/55839671/78204
                dimensions.x = Math.round(window.screen.width  * window.devicePixelRatio / (window.outerWidth / window.innerWidth) / 80) * 80;
                dimensions.y = Math.round(window.screen.height * window.devicePixelRatio / (window.outerWidth / window.innerWidth) / 60) * 60;
            } else {
                dimensions = getDimensions(parentRef.offsetWidth * window.devicePixelRatio);
            }
            if (dimensions.x !== width()) setWidth(dimensions.x);

            let scale = window.devicePixelRatio; // TODO: allow this to be set in the UI, but default to DPR
            wgputoy.resize(dimensions.x, dimensions.y, scale);
        });
    }

    useResizeObserver(parentRef, updateResolution);

    useEffect(() => {
        if (reset) {
            resetCallback();
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        loadTexture(0, loadedTextures[0].img);
    }, [loadedTextures[0]]);

    useEffect(() => {
        loadTexture(1, loadedTextures[1].img);
    }, [loadedTextures[1]]);

    useEffect(() => {
        if (requestFullscreenSignal) {
            requestFullscreen();
            setRequestFullscreenSignal(false);
        }
    }, [requestFullscreenSignal])

    return null;
}

export default WgpuToyController;