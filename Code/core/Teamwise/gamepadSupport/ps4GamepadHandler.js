/**
 * @author Michael Aichem
 */

import {systemState, viewer} from "../mainCore.js";
import {startupHandler} from "../handlers.js";
import {setCameraAttachment} from "../cameraManagement.js";

/**
 * This class enables the user to control the system via a PS4 controller.
 * Any PS4 controller connected to the system needs an own instance of this class.
 * It contains the necessary button mappings between the PS4 button/axes architecture and what is delivered by the Gemapad API.
 * Further, it contains the methods that handle the gamepad interaction by grabbing pressed buttons/moved axes and
 * performing the specified system actions.
 */
class PS4GamepadHandler {
    /**
     * Create an instance of the handler for the gamepad that has the index {@link gamepadIndex}
     * in the `navigator.getGamepads()` array delivered by the JS Gamepad API.
     * @param {*} gamepadIndex The index of the desired gamepad in the `navigator.getGamepads()` array.
     */
    constructor(gamepadIndex) {
        this.index = gamepadIndex;

        // This maps the button index of the Gamepad Object from the Gamepad API to
        // the actual name of the button on the PS4 gamepad.
        this.buttonMap = new Map([
            [0, "X"],
            [1, "Circle"],
            [2, "Square"],
            [3, "Triangle"],
            [4, "L1"],
            [5, "R1"],
            [6, "L2"],
            [7, "R2"],
            [8, "Share"],
            [9, "Options"],
            [10, "L3"],
            [11, "R3"],
            [12, "ArrowUp"],
            [13, "ArrowDown"],
            [14, "ArrowLeft"],
            [15, "ArrowRight"],
            [16, "PS"],
            [17, "Touchpad"]
        ]);

        // This maps the axis index of the Gamepad Object from the Gamepad API to
        // the actual name of the axis on the PS4 gamepad.
        this.axisMap = new Map([
            [0, "leftStickHorizontalAxis"], // attention: left equals -1 whereas right equals 1!
            [1, "leftStickVerticalAxis"], // attention: down equals 1 whereas up equals -1!
            [2, "rightStickHorizontalAxis"], // attention: left equals -1 whereas right equals 1!
            [3, "rightStickVerticalAxis"] // attention: down equals 1 whereas up equals -1!
        ]);

        // As the L3 button is used to switch between the camera attachment mode, we need to keep
        // track of the current state of this.
        // Note: This index only loops modulo 3.
        this.L3mode = 0;

        /*
     *  You can access the status of any button by using >>this.buttonStatus['buttonName']<<
     */
        this.buttonsStatus = {
            "Square": false,
            "X": false,
            "Circle": false,
            "Triangle": false,
            "L1": false,
            "R1": false,
            "L2": false,
            "R2": false,
            "Share": false,
            "Options": false,
            "L3": false,
            "R3": false,
            "PS": false,
            "Touchpad": false
            // These buttons are not recognised by the Gamepad API. This seems to be a common error, according to online forums.
            //'ButtonLeft', 'ButtonRight', 'ButtonUp', 'ButtonDown'
        };

        // Copying the status object in order to get an independent one to use as cache.
        this.buttonsCache = {};
        for (const attr in this.buttonsStatus) {
            this.buttonsCache[attr] = this.buttonsStatus[attr];
        }

        // Copying the status object in order to get an independent one to use as button hold counter.
        // Note: The number of the counter is always relative to the frequence of polling the buttons status.
        // Thus, e.g. buttonsHoldCount(['R1']) / 4 is the number of seconds the button was held.
        this.buttonsHoldCount = {};
        for (const attr in this.buttonsStatus) {
            this.buttonsHoldCount[attr] = 0;
        }

        /*
         *  You can access the status of any axis by using >>this.axesStatus['axisName']<<
         */
        this.axesStatus = {
            "leftStickHorizontalAxis": 0, // recognised as axes[0], attention: left equals -1 whereas right equals 1!
            "leftStickVerticalAxis": 0, // recognised as axes[1], attention: down equals 1 whereas up equals -1!
            "rightStickHorizontalAxis": 0, // recognised as axes[2], attention: left equals -1 whereas right equals 1!
            "rightStickVerticalAxis": 0, // recognised as axes[3], attention: down equals 1 whereas up equals -1!
        };

        // Copying the status object in order to get an independent one to use as axis hold counter.
        // Note: The number of the counter is always relative to the frequence of polling the buttons status.
        // Thus, e.g. axesHoldCount(['RightStickVerticalAxis']) / 4 is the number of seconds the axis was held.
        this.axesHoldCount = {};
        for (const attr in this.axesStatus) {
            this.axesHoldCount[attr] = 0;
        }

        this.camera = viewer.camera;

        this.cameraMoveRateOffsetFactor = 1;
        this.cameraLookRateOffset = 0;
    }

    /**
     * On each call, this method queries the Gamepad object and updates the buttons' and axis status as well as the buttonsCache.
     * Additionally, it performs the required actions specified to react on button presses and axis movements.
     */
    update() {
        // Note: Gamepad objects as delivered by the JS Gamepad API are static in that sense that their buttonStatus
        // properties are like snapshots and do not update themselves. Therefore we need to query the respective gamepad
        // on each call instead of just storing a reference to the once queried object!
        this.gamePad = navigator.getGamepads()[this.index];
        if (this.gamePad) {
            for (const attr in this.buttonsStatus) {
                this.buttonsCache[attr] = this.buttonsStatus[attr];
            }
            for (let i = 0; i < 18; i++) {
                this.buttonsStatus[this.buttonMap.get(i)] = this.gamePad.buttons[i].pressed;
            }

            for (let i = 0; i < 4; i++) {
                this.axesStatus[this.axisMap.get(i)] = this.gamePad.axes[i];
            }

            // ========= Handlers ===============

            // Making the camera movement relative to the camera height makes it more natural to navigate by
            // enabling huge steps on globe level and at the same time sensitivity near the ground.
            const cameraHeight = viewer.scene.globe.ellipsoid.cartesianToCartographic(this.camera.position).height;
            let moveRate;
            const lookRate = 0.02 + this.cameraLookRateOffset;
            // As this kind of controls gets weird if the camera is attached to an entity,
            // it is disabled in this mode.
            if (systemState.cameraAttachedToEntity) {
                moveRate = 0.5 * this.cameraMoveRateOffsetFactor;
            } else {
                moveRate = (cameraHeight / 100.0) * this.cameraMoveRateOffsetFactor;
            }

            // The axis thresholds of 0.1 are necessary due to inaccuracies in their detection.
            if (Math.abs(this.axesStatus["leftStickHorizontalAxis"]) >= 0.1) {
                if (this.axesStatus["leftStickHorizontalAxis"] < 0) {
                    this.camera.moveLeft(Math.abs(this.axesStatus["leftStickHorizontalAxis"]) * moveRate);
                } else {
                    this.camera.moveRight(this.axesStatus["leftStickHorizontalAxis"] * moveRate);
                }
            }
            if (Math.abs(this.axesStatus["leftStickVerticalAxis"]) >= 0.1) {
                if (this.axesStatus["leftStickVerticalAxis"] < 0) {
                    this.camera.moveUp(Math.abs(this.axesStatus["leftStickVerticalAxis"]) * moveRate);
                } else {
                    this.camera.moveDown(this.axesStatus["leftStickVerticalAxis"] * moveRate);
                }
            }
            if (Math.abs(this.axesStatus["rightStickHorizontalAxis"]) >= 0.1) {
                if (this.axesStatus["rightStickHorizontalAxis"] < 0) {
                    this.camera.lookLeft(Math.abs(this.axesStatus["rightStickHorizontalAxis"]) * lookRate);
                } else {
                    this.camera.lookRight(this.axesStatus["rightStickHorizontalAxis"] * lookRate);
                }
            }
            if (Math.abs(this.axesStatus["rightStickVerticalAxis"]) >= 0.1) {
                if (this.axesStatus["rightStickVerticalAxis"] < 0) {
                    this.camera.lookUp(Math.abs(this.axesStatus["rightStickVerticalAxis"]) * lookRate);
                } else {
                    this.camera.lookDown(this.axesStatus["rightStickVerticalAxis"] * lookRate);
                }
            }

            if (this.buttonPressed("R2")) {
                this.camera.moveForward(moveRate);
            }
            if (this.buttonPressed("L2")) {
                this.camera.moveBackward(moveRate);
            }

            if (this.buttonPressed("X") && !this.buttonHeld("X")) {
                viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
            }

            // Managing the L3 camera attachment loop.
            if (this.buttonPressed("L3") && !this.buttonHeld("L3")) {
                // Ensuring the 0,1,2,0,1,2,0,... loop.
                this.L3mode = (this.L3mode + 1) % 3;

                // mode === 0 means that there is no camera attachment anymore.
                if (this.L3mode === 0) {
                    setCameraAttachment(0, undefined, undefined);
                } else if (viewer.selectedEntity) {
                    setCameraAttachment(this.L3mode, new Cesium.Cartesian3(-7.0, 0.0, 4.5), new Cesium.Cartesian3(1.2, 0.0, -0.45));
                }
            }

            // Jumps back to the whole data source, resets the camera transformation matrix and the attachment flags.
            if (this.buttonPressed("R3") && !this.buttonHeld("R3")) {
                viewer.flyTo(viewer.clockTrackedDataSource);
                viewer.camera.setView({ endTransform: Cesium.Matrix4.IDENTITY });
                systemState.cameraAttachedToEntity = false;
                systemState.cameraOrientationAttachedToEntity = false;
            }

            // adjust multiplier in 0.5 steps.
            if (this.buttonPressed("R1") && !this.buttonHeld("R1")) {
                viewer.clock.multiplier += 0.5;
            }
            if (this.buttonPressed("L1") && !this.buttonHeld("L1")) {
                viewer.clock.multiplier -= 0.5;
            }
        }
    }

    /**
     * This function gets called four times a second.
     * It may be used to detect button holdings, as these do not need to be monitored in a higher frequency.
     * On call, this function updates certain hold counters and performs respective actions.
     */
    fourTimesASecond() {
        if (this.buttonHeld("R1")) { // MA: pressed?
            this.buttonsHoldCount["L1"] = 0;
            // If both are held, we reset the multiplier to 1.
            if (this.buttonHeld("L1")) {
                this.buttonsHoldCount["R1"] = 0;
                viewer.clock.multiplier = 1;
            } else {
                this.buttonsHoldCount["R1"]++;
                // We only react on hold events if the button has been held for at least a second.
                if (this.buttonsHoldCount["R1"] >= 4) {
                    viewer.clock.multiplier += (this.buttonsHoldCount["R1"] <= 10 ? 1 : this.buttonsHoldCount["R1"] / 2);
                }
            }
        } else {
            this.buttonsHoldCount["R1"] = 0;
            if (this.buttonHeld("L1")) {
                this.buttonsHoldCount["L1"]++;
                if (this.buttonsHoldCount["L1"] >= 4) {
                    viewer.clock.multiplier -= (this.buttonsHoldCount["L1"] <= 10 ? 1 : this.buttonsHoldCount["L1"] / 2);
                }
            } else {
                this.buttonsHoldCount["L1"] = 0;
            }
        }

        let moveRateOffsetFactorChanged = false;
        if (this.buttonPressed("L2")) {
            this.buttonsHoldCount["L2"]++;
            if (this.buttonsHoldCount["L2"] >= 4) {
                this.cameraMoveRateOffsetFactor += 0.2;
                moveRateOffsetFactorChanged = true;
            }
        } else {
            this.buttonsHoldCount["L2"] = 0;
        }

        if (this.buttonPressed("R2")) {
            this.buttonsHoldCount["R2"]++;
            if (this.buttonsHoldCount["R2"] >= 4) {
                this.cameraMoveRateOffsetFactor += 0.2;
                moveRateOffsetFactorChanged = true;
            }
        } else {
            this.buttonsHoldCount["R2"] = 0;
        }

        if (Math.abs(this.axesStatus["leftStickHorizontalAxis"]) >= 0.5) {
            this.axesHoldCount["leftStickHorizontalAxis"]++;
            if (this.axesHoldCount["leftStickHorizontalAxis"] >= 4) {
                this.cameraMoveRateOffsetFactor += 0.2;
                moveRateOffsetFactorChanged = true;
            }
        } else {
            this.axesHoldCount["leftStickHorizontalAxis"] = 0;
        }

        if (Math.abs(this.axesStatus["leftStickVerticalAxis"]) >= 0.5) {
            this.axesHoldCount["leftStickVerticalAxis"]++;
            if (this.axesHoldCount["leftStickVerticalAxis"] >= 4) {
                this.cameraMoveRateOffsetFactor += 0.2;
                moveRateOffsetFactorChanged = true;
            }
        } else {
            this.axesHoldCount["leftStickVerticalAxis"] = 0;
        }
        if (!moveRateOffsetFactorChanged) {
            this.cameraMoveRateOffsetFactor = 1;
        }

        let lookRateOffsetChanged = false;
        if (Math.abs(this.axesStatus["rightStickVerticalAxis"]) >= 0.5) {
            this.axesHoldCount["rightStickVerticalAxis"]++;
            if (this.axesHoldCount["rightStickVerticalAxis"] >= 4) {
                this.cameraLookRateOffset += 0.01;
                lookRateOffsetChanged = true;
            }
        } else {
            this.axesHoldCount["rightStickVerticalAxis"] = 0;
        }
        if (!moveRateOffsetFactorChanged) {
            this.cameraMoveRateOffsetFactor = 1;
        }
        if (Math.abs(this.axesStatus["rightStickHorizontalAxis"]) >= 0.5) {
            this.axesHoldCount["rightStickHorizontalAxis"]++;
            if (this.axesHoldCount["rightStickHorizontalAxis"] >= 4) {
                this.cameraLookRateOffset += 0.01;
                lookRateOffsetChanged = true;
            }
        } else {
            this.axesHoldCount["rightStickHorizontalAxis"] = 0;
        }
        if (!lookRateOffsetChanged) {
            this.cameraLookRateOffset = 0;
        }
    }

    /**
     * Returns whether this button has been pressed (during the last `update()`-interval).
     * @param {*} button The queried button.
     */
    buttonPressed(button) {
        return this.buttonsStatus[button];
    }

    /**
     * Returns whether this button has been held (during the last `update()`-intervals).
     * @param {*} button The queried button.
     */
    buttonHeld(button) {
        return this.buttonsCache[button] && this.buttonsStatus[button];
    }
}

const registeredGamepadIndices = [];

// to keep track of the gamepad input we add two interval functions.
/**
 * The initialisation procedure for a gamepad. It creates an instance of a {@link PS4GamepadHandler} and
 * sets the two interval functions.
 */
function initGamepad() {
    setInterval(function () {
        const availableIndices = queryGamepads();
        if (availableIndices.length > 0) {
            availableIndices.filter(index => !registeredGamepadIndices.includes(index)).forEach(index => {
                registeredGamepadIndices.push(index);
                const gc = new PS4GamepadHandler(index);
                setInterval(function () {
                    if (systemState.gamePadActivated) {
                        gc.update();
                    }
                }, 50);
                setInterval(function () {
                    if (systemState.gamePadActivated) {
                        gc.fourTimesASecond();
                    }
                }, 250);
            });
        }
    }, 1000);
}

/**
 * This function checks the navigators gamepad array for gamepads with 18 buttons, what we take as a sign for a PS4 controller.
 */
function queryGamepads() {
    const indices = [];
    for(let index = 0; index < navigator.getGamepads().length; index++) {
        if (navigator.getGamepads()[index] && navigator.getGamepads()[index].buttons.length === 18) {
            indices.push(index);
        }
    }
    return indices;
}

// Initialize the gamepad support after starting Cesium.
startupHandler.addAfterStartup(initGamepad);
