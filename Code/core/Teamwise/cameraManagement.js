import {viewer, systemState} from "./mainCore.js";
import {startupHandler} from "./handlers.js";

startupHandler.addAfterStartup(viewer => {
    // Any camera perspective adjustments should be performed on preRender to avoid delayed calculations.
    viewer.scene.preRender.addEventListener(function (_scene, time) {
        if (systemState.cameraAttachedToEntity) {
            manageCameraAttachment(time);
        }
        // This prevents the camera from becoming crooked by setting the cameras roll value to 0 before rendering.
        // This prevents the user from uncomfortable view positions.
        viewer.camera.setView({
            orientation: {
                heading: viewer.camera.heading,
                pitch: viewer.camera.pitch,
                roll: 0.0
            }
        });
    });
});



/**
 * This function performs the operations that are necessary in order to have the camera behaving like it has been specified
 * in the variables {@link systemState.cameraAttachedToEntity} and {@link systemState.cameraOrientationAttachedToEntity}.
 * @param {*} time The current time, i.e. the time point that is going to be rendered
 * and that the camera should behave according to.
 */
function manageCameraAttachment(time) {
    // Grabbing position of the attached entity
    const position = systemState.cameraTrackedEntity.position.getValue(time);
    if (!Cesium.defined(position)) {
        return;
    }

    // The transform sets a coordinate system transformation matrix for the camera
    // By choosing this according to the tracked entities' position and orientation,
    // we set the reference frame of the camera to be the same as the reference frame of the entity.
    let transform;
    if (!Cesium.defined(systemState.cameraTrackedEntity.orientation) || !systemState.cameraOrientationAttachedToEntity) {
        // if there is no orientation OR if we do not want the camera to be synchronised with the entities orientation
        transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    } else {
        const orientation = systemState.cameraTrackedEntity.orientation.getValue(time);
        if (!Cesium.defined(orientation)) {
            return;
        }

        transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromQuaternion(orientation), position);
    }

    // Save the current camera state, which is relative to the entities/cameras reference frame
    // from the last render process.
    const offset = Cesium.Cartesian3.clone(viewer.camera.position);
    const direction = Cesium.Cartesian3.clone(viewer.camera.direction);
    const up = Cesium.Cartesian3.clone(viewer.camera.up);

    // Set camera to be in model's reference frame.
    viewer.camera.lookAtTransform(transform);

    // Reset the camera state to the saved state so it appears fixed in the model's frame.
    Cesium.Cartesian3.clone(offset, viewer.camera.position);
    Cesium.Cartesian3.clone(direction, viewer.camera.direction);
    Cesium.Cartesian3.clone(up, viewer.camera.up);
    Cesium.Cartesian3.cross(direction, up, viewer.camera.right);
}

/**
 * This function is used to change the attachment mode/behaviour of the camera.
 * Mode `0` means no attachment, i.e. a static viewpoint.
 * Mode `1` means that the camera is only attached to the entities position but not to its orientation.
 * Mode `2` means that the camera is attached to the entities position as well as its orientation.
 * @param {number} mode The new tracking mode that is going to be set. It may be `0`, `1` or `2`.
 * For more information see function description.
 * @param {Cesium.Cartesian3} position The initial position that will be assigned to the camera.
 * @param {*} direction The initial direction that will be assigned to the camera.
 */
function setCameraAttachment(mode, position, direction) {
    if (mode === 0) {
        // Store relative camera positions in world coordinates to ensure smooth transition during unattachment.
        const pos = viewer.camera.positionWC.clone();
        const dir = viewer.camera.directionWC.clone();
        systemState.cameraAttachedToEntity = false;
        systemState.cameraOrientationAttachedToEntity = false;
        // Resetting the cameras transformation matrix is important here.
        // Otherwise the camera controls would behave quite counterintuitive
        // as they will still be relative to the entities last position during camera attachment.
        viewer.camera.setView({ endTransform: Cesium.Matrix4.IDENTITY });
        // Restore relative camera positions.
        viewer.camera.position = pos;
        viewer.camera.direction = dir;
    } else if (viewer.selectedEntity) {
        // Set initial camera position and orientation to be when in the model's reference frame.
        // This is relative to the entity that the camera is attached to.
        viewer.camera.position = position;
        viewer.camera.direction = direction;
        // viewer.camera.up = new Cesium.Cartesian3(0.0, 0.0, 1.0);
        // viewer.camera.right = new Cesium.Cartesian3(0.0, -1.0, 0.0);
        systemState.cameraTrackedEntity = viewer.selectedEntity;
        // Managing the flags that are important for the render loop in the mainCore.
        systemState.cameraAttachedToEntity = true;
        systemState.cameraOrientationAttachedToEntity = (mode === 2);

        // As the performance of different systems may cause the problem that the next render loop
        // only occurs when the above set relative camera positions have already been outdated,
        // we call the management function once before to ensure the fixation of the relative camera parameters.
        // This does not change anything but just prevents from the above described bug.
        // Took me 3 days to figure that out! :)
        manageCameraAttachment(viewer.clock.currentTime);
    }
}

export {
    setCameraAttachment
};
