/**
 * @author Alexej Gluschkow
 */


// the main funciton to control the character  mydata, birds
export default function gamePadContr(viewer, vrOptions) {
  //checks if the button is pressed or not
  var pressed = false;
  let camera = viewer.camera;
  //get the connected gamepads
  var gamePad = navigator.getGamepads()[0];
  // update the viewVector to know where to move

  //the keyboard controls for testing stuff in the browser
  document.onkeydown = function (e) {
    if (e.keyCode == 87) { // w
      camera.moveForward(1);
    } else if (e.keyCode == 83) { //s
      camera.moveForward(-1);
    } else if (e.keyCode == 65) { //a
      camera.moveRight(-1);
    } else if (e.keyCode == 68) { //d
      camera.moveRight(1);
    }
  };


  //the gamepad controls which is run inside the render loop
  this.update = function () {
    //get the connected gamepads
    gamePad = navigator.getGamepads()[0];
    // a gamepad is found
    if (gamePad != null) {
      if (gamePad.axes[0] > 0.1 || gamePad.axes[0] < -0.1) {
        camera.moveRight(gamePad.axes[0]);
      }
      if (gamePad.axes[1] > 0.1 || gamePad.axes[1] < -0.1) {
        camera.moveForward(-gamePad.axes[1]);
        //console.log("gamePad.axes[1]");
      }


      //if a specific button is pressed change the visualisation
      if (gamePad.buttons[0].value > 0 && !pressed) {
        //look out that the button is pressed only once
        pressed = true;
        vrOptions.fixed = !vrOptions.fixed;
      }
     
      var nothingPressed = true;
      for (var i = 0; i < 6; i++) {
        if (pressed && gamePad.buttons[i].pressed) {
          nothingPressed = false;
          break;
        }
        nothingPressed = true;
      }
      if (nothingPressed) {
        pressed = false;
      }
    }
  };
};
