/**
 * This file is a modified version of OrbitControls
 * Contributors:
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
import {OrbitControls, Vector2, Vector3} from 'three';


export class Controls extends OrbitControls {

  // Set to false to disable this control
  enabled = true;

  // "target" sets the location of focus, where the control orbits around
  // and where it pans with respect to.
  target = new Vector3();
  // center is old, deprecated; use "target" instead
  center = this.target;

  // This option actually enables dollying in and out; left as "zoom" for
  // backwards compatibility
  noZoom = false;
  zoomSpeed = 1.0;
  // Limits to how far you can dolly in and out
  minDistance = 0;
  maxDistance = 1500; // Infinity;

  // Set to true to disable this control
  noRotate = false;
  rotateSpeed = 1.0;

  // Set to true to disable this control
  noPan = false;
  keyPanSpeed = 40.0;	// pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  autoRotate = false;
  autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  minPolarAngle = 0; // radians
  maxPolarAngle = Math.PI / 2; // radians

  // Set to true to disable use of the keys
  noKeys = false;
  // The four arrow keys
  keys = {LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40};

  cameraMovedCallbacks = $.Callbacks();

  needsUpdate = true;


  EPS = 0.000001;

  rotateStart = new Vector2();
  rotateEnd = new Vector2();
  rotateDelta = new Vector2();

  panStart = new Vector2();
  panEnd = new Vector2();
  panDelta = new Vector2();

  dollyStart = new Vector2();
  dollyEnd = new Vector2();
  dollyDelta = new Vector2();

  phiDelta = 0;
  thetaDelta = 0;
  scale = 1;
  panV = new Vector3();

  STATE = {NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY: 4, TOUCH_PAN: 5};
  state = this.STATE.NONE;

  constructor(public object: any, domElement: any) {
    super(object, domElement);
    domElement = (domElement !== undefined) ? domElement : document;
  }

  controlsActive() {
    return (this.state === this.STATE.NONE);
  }

  setPan(vec3: Vector3) {
    this.panV = vec3;
  };

  panTo(vec3: Vector3) {
    let newTarget = new Vector3(vec3.x, this.target.y, vec3.z);
    let delta = this.target.clone().sub(newTarget);
    this.panV.sub(delta);
    this.update();
  };

  rotateLeft(angle: number) {
    if (angle === undefined) {
      angle = this.getAutoRotationAngle();
    }
    this.thetaDelta -= angle;
  };

  rotateUp(angle: number) {
    if (angle === undefined) {
      angle = this.getAutoRotationAngle();
    }
    this.phiDelta -= angle;
  };

  // pass in distance in world space to move left
  panLeft(distance: number) {

    let panOffset = new Vector3();
    let te = this.object.matrix.elements;
    // get X column of matrix
    panOffset.set(te[0], 0, te[2]);
    panOffset.normalize();

    panOffset.multiplyScalar(-distance);

    this.panV.add(panOffset);

  };

  // pass in distance in world space to move up
  panUp(distance: number) {

    let panOffset = new Vector3();
    let te = this.object.matrix.elements;
    // get Y column of matrix
    panOffset.set(te[4], 0, te[6]);
    panOffset.normalize();
    panOffset.multiplyScalar(distance);

    this.panV.add(panOffset);
  };

  // main entry point; pass in Vector2 of change desired in pixel space,
  // right and down are positive
  pan(deltaX: number, deltaY: number) {

    let element = this.domElement === document ? this.domElement.body : this.domElement as HTMLElement;

    if (this.object.fov !== undefined) {

      // perspective
      let position = this.object.position;
      let offset = position.clone().sub(this.target);
      let targetDistance = offset.length();

      // half of the fov is center to top of screen
      targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);
      // we actually don't use screenWidth, since perspective camera is fixed to screen height
      this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
      this.panUp(2 * deltaY * targetDistance / element.clientHeight);
    } else if (this.object.top !== undefined) {

      // orthographic
      this.panLeft(deltaX * (this.object.right - this.object.left) / element.clientWidth);
      this.panUp(deltaY * (this.object.top - this.object.bottom) / element.clientHeight);
    } else {

      // camera neither orthographic or perspective - warn user
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
    }

    this.update()
  };


  panXY(x: number, y: number) {
    this.pan(x, y);
  }


  dollyIn(dollyScale?: number) {
    if (dollyScale === undefined) {
      dollyScale = this.getZoomScale();
    }

    this.scale /= dollyScale;
  };


  dollyOut(dollyScale?: number) {
    if (dollyScale === undefined) {
      dollyScale = this.getZoomScale();
    }

    this.scale *= dollyScale;
  };

  update() {
    let position = this.object.position;
    let offset = position.clone().sub(this.target);

    // angle from z-axis around y-axis
    let theta = Math.atan2(offset.x, offset.z);

    // angle from y-axis
    let phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);

    if (this.autoRotate) {
      this.rotateLeft(this.getAutoRotationAngle());
    }

    theta += this.thetaDelta;
    phi += this.phiDelta;

    // restrict phi to be between desired limits
    phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));

    // restrict phi to be betwee EPS and PI-EPS
    phi = Math.max(this.EPS, Math.min(Math.PI - this.EPS, phi));

    let radius = offset.length() * this.scale;

    // restrict radius to be between desired limits
    radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

    // move target to panned location
    this.target.add(this.panV);

    offset.x = radius * Math.sin(phi) * Math.sin(theta);
    offset.y = radius * Math.cos(phi);
    offset.z = radius * Math.sin(phi) * Math.cos(theta);

    position.copy(this.target).add(offset);

    this.object.lookAt(this.target);

    this.thetaDelta = 0;
    this.phiDelta = 0;
    this.scale = 1;
    this.panV.set(0, 0, 0);

    this.cameraMovedCallbacks.fire();
    this.needsUpdate = true;
  };

  getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }

  getZoomScale() {
    return Math.pow(0.95, this.zoomSpeed);
  }

  onMouseDown(event: MouseEvent): any {

    if (this.enabled === false) {
      return;
    }
    event.preventDefault();

    if (event.button === 0) {
      if (this.noRotate === true) {
        return;
      }

      this.state = this.STATE.ROTATE;

      this.rotateStart.set(event.clientX, event.clientY);

    } else if (event.button === 1) {
      if (this.noZoom === true) {
        return;
      }

      this.state = this.STATE.DOLLY;

      this.dollyStart.set(event.clientX, event.clientY);

    } else if (event.button === 2) {
      if (this.noPan === true) {
        return;
      }

      this.state = this.STATE.PAN;

      this.panStart.set(event.clientX, event.clientY);
    }

    // Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
    this.domElement.addEventListener('mousemove', this.onMouseMove, false);
    this.domElement.addEventListener('mouseup', this.onMouseUp, false);

  }

  onMouseMove(event: MouseEvent) {

    if (this.enabled === false) return;

    event.preventDefault();

    let element = this.domElement === document ? this.domElement.body : this.domElement as HTMLElement;

    if (this.state === this.STATE.ROTATE) {

      if (this.noRotate === true) return;

      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

      // rotating across whole screen goes 360 degrees around
      this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);
      // rotating up and down along whole screen attempts to go 360, but limited to 180
      this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);

      this.rotateStart.copy(this.rotateEnd);

    } else if (this.state === this.STATE.DOLLY) {

      if (this.noZoom === true) return;

      this.dollyEnd.set(event.clientX, event.clientY);
      this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

      if (this.dollyDelta.y > 0) {

        this.dollyIn();

      } else {

        this.dollyOut();

      }

      this.dollyStart.copy(this.dollyEnd);

    } else if (this.state === this.STATE.PAN) {

      if (this.noPan === true) return;

      this.panEnd.set(event.clientX, event.clientY);
      this.panDelta.subVectors(this.panEnd, this.panStart);

      this.pan(this.panDelta.x, this.panDelta.y);

      this.panStart.copy(this.panEnd);
    }

    // Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
    this.update();
  }

  onMouseUp(/* event */) {
    if (this.enabled === false) return;

    // Greggman fix: https://github.com/greggman/three.js/commit/fde9f9917d6d8381f06bf22cdff766029d1761be
    this.domElement.removeEventListener('mousemove', this.onMouseMove, false);
    this.domElement.removeEventListener('mouseup', this.onMouseUp, false);

    this.state = this.STATE.NONE;
  }

  onMouseWheel(event: WheelEvent): void {
    if (this.enabled === false || this.noZoom === true) return;

    let delta = 0;

    if (event.wheelDelta) { // WebKit / Opera / Explorer 9
      delta = event.wheelDelta;
    } else if (event.detail) { // Firefox
      delta = -event.detail;
    }

    if (delta > 0) {
      this.dollyOut();

    } else {

      this.dollyIn();
    }
    this.update();
  }

  onKeyDown(event: KeyboardEvent): void {

    if (this.enabled === false) {
      return;
    }
    if (this.noKeys === true) {
      return;
    }
    if (this.noPan === true) {
      return;
    }

    switch (event.keyCode) {

      case this.keys.UP:
        this.pan(0, this.keyPanSpeed);
        break;
      case this.keys.BOTTOM:
        this.pan(0, -this.keyPanSpeed);
        break;
      case this.keys.LEFT:
        this.pan(this.keyPanSpeed, 0);
        break;
      case this.keys.RIGHT:
        this.pan(-this.keyPanSpeed, 0);
        break;
    }

  }

  touchstart(event: TouchEvent): void {

    if (this.enabled === false) {
      return;
    }

    switch (event.touches.length) {

      case 1:	// one-fingered touch: rotate
        if (this.noRotate === true) {
          return;
        }

        this.state = this.STATE.TOUCH_ROTATE;

        this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        break;

      case 2:	// two-fingered touch: dolly
        if (this.noZoom === true) {
          return;
        }

        this.state = this.STATE.TOUCH_DOLLY;

        let dx = event.touches[0].pageX - event.touches[1].pageX;
        let dy = event.touches[0].pageY - event.touches[1].pageY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        this.dollyStart.set(0, distance);
        break;

      case 3: // three-fingered touch: pan
        if (this.noPan === true) {
          return;
        }

        this.state = this.STATE.TOUCH_PAN;

        this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
        break;

      default:
        this.state = this.STATE.NONE;

    }
  }

  touchmove(event: TouchEvent): void {

    if (this.enabled === false) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    let element = this.domElement === document ? this.domElement.body : this.domElement as HTMLElement;

    switch (event.touches.length) {

      case 1: // one-fingered touch: rotate
        if (this.noRotate === true) {
          return;
        }
        if (this.state !== this.STATE.TOUCH_ROTATE) {
          return;
        }

        this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

        // rotating across whole screen goes 360 degrees around
        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);
        // rotating up and down along whole screen attempts to go 360, but limited to 180
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);

        this.rotateStart.copy(this.rotateEnd);
        break;

      case 2: // two-fingered touch: dolly
        if (this.noZoom === true) {
          return;
        }
        if (this.state !== this.STATE.TOUCH_DOLLY) {
          return;
        }

        let dx = event.touches[0].pageX - event.touches[1].pageX;
        let dy = event.touches[0].pageY - event.touches[1].pageY;
        let distance = Math.sqrt(dx * dx + dy * dy);

        this.dollyEnd.set(0, distance);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

        if (this.dollyDelta.y > 0) {
          this.dollyOut();
        } else {
          this.dollyIn();
        }

        this.dollyStart.copy(this.dollyEnd);
        break;

      case 3: // three-fingered touch: pan
        if (this.noPan === true) {
          return;
        }
        if (this.state !== this.STATE.TOUCH_PAN) {
          return;
        }

        this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
        this.panDelta.subVectors(this.panEnd, this.panStart);

        this.pan(this.panDelta.x, this.panDelta.y);

        this.panStart.copy(this.panEnd);
        break;

      default:
        this.state = this.STATE.NONE;
    }
  }

  touchend(/* event */): void {
    if (this.enabled === false) {
      return;
    }
    this.state = this.STATE.NONE;
  }

  addEvents() {
    this.domElement.addEventListener('contextmenu', function (event) {
      event.preventDefault();
    }, false);

    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('mousewheel', this.onMouseWheel, false);
    this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel, false); // firefox
    this.domElement.addEventListener('touchstart', this.touchstart, false);
    this.domElement.addEventListener('touchend', this.touchend, false);
    this.domElement.addEventListener('touchmove', this.touchmove, false);

    window.addEventListener('keydown', this.onKeyDown, false);
  }


};

