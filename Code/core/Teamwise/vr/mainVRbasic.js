/**
 * @author Alexej Gluschkow
 */

import {startupHandler} from "../handlers.js";
import gamePadContr from "./vrGamepad.js";

const frameData = new VRFrameData();

let vrGamepadCont;

/* The options needed to give basic controls for VR */
let vrOptions;

let vrDisplay = window;

function onAnimationFrame() {
    vrDisplay.requestAnimationFrame(onAnimationFrame);
    vrDisplay.getFrameData(frameData);
}


function getColor(color, alpha) {
    return Cesium.Color.fromAlpha(color, parseFloat(alpha));
}

// Add the initialization to the startup process, if Teamwise is in VR mode.
startupHandler.addAfterStartup(function(viewer, mode) {
    // Initialize only if vr mode is selected.
    if (mode === "vr") {
        initVR(viewer);
    }
});

// the main function to control the character
function initVR(viewer) {

    vrOptions = {
        currSelection: 0,
        currNNs: [0],
        lastPos: new Cesium.Cartesian3(),
        fixed: true
    };
    navigator.getVRDisplays().then(function (displays) {
        if (displays.length > 0) {
            vrDisplay = displays[0];
            vrDisplay.requestAnimationFrame(onAnimationFrame);

        }
    });

    vrGamepadCont = new gamePadContr(viewer, vrOptions);

    viewer.clock.onTick.addEventListener(function (clock) {
        if (Cesium.defined(vrGamepadCont)) {
            vrGamepadCont.update();
        }
        if (!Cesium.defined(viewer.dataSources.get(0)))
            {return;}

        const selectedEntity = viewer.dataSources.get(0).entities.values[vrOptions.currSelection];
        if (Cesium.defined(selectedEntity)) {
            selectedEntity.model.color = getColor(selectedEntity.model.color, 0.3);
        }
    });

    viewer.vrButton.container.addEventListener("click", goVR);
    viewer.scene.debugShowFramesPerSecond = true;
    const camera = viewer.camera;

    viewer.scene.preRender.addEventListener(function (scene, time) {
        // Update the values that may change frame-to-frame
        if (!Cesium.defined(viewer.dataSources.get(0)))
            {return;}
        const entities = viewer.dataSources.get(0).entities.values;
        if (!Cesium.defined(entities))
            {return;}
        const position = entities[vrOptions.currSelection].position.getValue(time);
        if (!Cesium.defined(position)) {
            return;
        }
        let transform;
        if (Cesium.defined(frameData)) {
            const pose = frameData.pose;
            if (Cesium.defined(pose)) {

                const ori = pose.orientation;
                let q;
                if (Cesium.defined(ori)) {
                    if (ori[0] == 0 && ori[1] == 0 && ori[2] == 0 && ori[3] == 0) {
                        q = Cesium.Quaternion.IDENTITY;
                    } else {
                        q = new Cesium.Quaternion(ori[2], ori[0], -ori[1], ori[3]);
                        Cesium.Quaternion.inverse(q, q);
                    }
                    if (!vrOptions.fixed) {
                        const fixedFrame = Cesium.Transforms.eastNorthUpToFixedFrame(vrOptions.lastPos);
                        const tmpRot = new Cesium.Matrix3();
                        Cesium.Matrix4.getRotation(fixedFrame, tmpRot);
                        Cesium.Quaternion.multiply(Cesium.Quaternion.fromRotationMatrix(tmpRot), q, q);
                        transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromQuaternion(q), vrOptions.lastPos);
                    } else {
                        vrOptions.lastPos = position;
                        if (!Cesium.defined(entities[vrOptions.currSelection].orientation)) {
                            const fixedFrame = Cesium.Transforms.eastNorthUpToFixedFrame(position);
                            const tmpRot = new Cesium.Matrix3();
                            Cesium.Matrix4.getRotation(fixedFrame, tmpRot);
                            Cesium.Quaternion.multiply(Cesium.Quaternion.fromRotationMatrix(tmpRot), q, q);
                        } else {
                            const orientation = entities[vrOptions.currSelection].orientation.getValue(time);
                            if (!Cesium.defined(orientation)) {
                                return;
                            }
                            Cesium.Quaternion.multiply(orientation, q, q);
                        }
                        transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromQuaternion(q), position);

                    }
                } else {
                    transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
                }
            }
        } else {
            transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
        }

        // Save camera state
        const offset = Cesium.Cartesian3.clone(camera.position);
        const direction = Cesium.Cartesian3.clone(camera.direction);
        const up = Cesium.Cartesian3.clone(camera.up);

        // Set camera to be in model's reference frame.
        camera.lookAtTransform(transform);

        // Reset the camera state to the saved state so it appears fixed in the model's frame.
        Cesium.Cartesian3.clone(offset, camera.position);
        Cesium.Cartesian3.clone(direction, camera.direction);
        Cesium.Cartesian3.clone(up, camera.up);
        Cesium.Cartesian3.cross(direction, up, camera.right);

    });

    function goVR() {
        const camera = viewer.camera;
        camera.position = new Cesium.Cartesian3(0.0, 0.0, 1.0);
        camera.direction = new Cesium.Cartesian3(1.0, 0.0, 0.0);
        camera.up = new Cesium.Cartesian3(0.0, 0.0, 1.0);
        camera.right = new Cesium.Cartesian3(0.0, -1.0, 0.0);

    }
}
