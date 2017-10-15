import {ImageUtils, PCFSoftShadowMap, PerspectiveCamera, Vector2, Vector3, WebGLRenderer} from 'three';
import Controller from './controller';
import Controls from './controls';
import HUD from './hud';
import Skybox from './skybox';

function Main(model, element, canvasElement, opts) {
  let scope = this;

  let options = {
    resize: true,
    pushHref: false,
    spin: true,
    spinSpeed: .00002,
    clickPan: true,
    canMoveFixedItems: false
  }

  // override with manually set options
  for (let opt in options) {
    if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
      options[opt] = opts[opt]
    }
  }

  let scene = model.scene;

  this.element = $(element);
  let domElement;

  let camera: PerspectiveCamera;
  let renderer: WebGLRenderer;
  this.controls;
  let canvas;
  let controller: any;
  let floorplan;

  // var canvas;
  // var canvasElement = canvasElement;

  let needsUpdate = false;

  let lastRender = Date.now();
  let mouseOver = false;
  let hasClicked = false;

  let hud: any;

  this.heightMargin;
  this.widthMargin;
  this.elementHeight;
  this.elementWidth;

  this.itemSelectedCallbacks = $.Callbacks(); // item
  this.itemUnselectedCallbacks = $.Callbacks();

  this.wallClicked = $.Callbacks(); // wall
  this.floorClicked = $.Callbacks(); // floor
  this.nothingClicked = $.Callbacks();

  function init() {
    ImageUtils.crossOrigin = "";

    domElement = scope.element.get(0); // Container
    camera = new PerspectiveCamera(45, 1, 1, 10000);
    renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true // required to support .toDataURL()
    });
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.Soft = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    let skybox = Skybox(scene);

    scope.controls = new Controls(camera, domElement);

    hud = HUD(scope);

    controller = Controller(
      scope, model, camera, scope.element, scope.controls, hud);

    domElement.appendChild(renderer.domElement);

    // handle window resizing
    scope.updateWindowSize();
    if (options.resize) {
      $(window).resize(scope.updateWindowSize);
    }

    // setup camera nicely
    scope.centerCamera();
    model.floorplan.fireOnUpdatedRooms(scope.centerCamera);

    let lights = new this.Three.Lights(scene, model.floorplan);

    floorplan = new this.Three.Floorplan(scene, model.floorplan, scope.controls);

    animate();

    scope.element.mouseenter(function () {
      mouseOver = true;
    }).mouseleave(function () {
      mouseOver = false;
    }).click(function () {
      hasClicked = true;
    });

    // canvas = new this.ThreeCanvas(canvasElement, scope);
  }

  function spin() {
    if (options.spin && !mouseOver && !hasClicked) {
      let theta = 2 * Math.PI * options.spinSpeed * (Date.now() - lastRender);
      scope.controls.rotateLeft(theta);
      scope.controls.update()
    }
  }

  this.dataUrl = function () {
    let dataUrl = renderer.domElement.toDataURL("image/png");
    return dataUrl;
  }

  this.stopSpin = function () {
    hasClicked = true;
  }

  this.options = function () {
    return options;
  }

  this.getModel = function () {
    return model;
  }

  this.getScene = function () {
    return scene;
  }

  this.getController = function () {
    return controller;
  }

  this.getCamera = function () {
    return camera;
  }

  this.needsUpdate = function () {
    needsUpdate = true;

  }

  function shouldRender() {
    // Do we need to draw a new frame
    if (scope.controls.needsUpdate || controller.needsUpdate || needsUpdate || model.scene.needsUpdate) {
      scope.controls.needsUpdate = false;
      controller.needsUpdate = false;
      needsUpdate = false;
      model.scene.needsUpdate = false;
      return true;
    } else {
      return false;
    }
  }

  function render() {
    spin();
    if (shouldRender()) {
      renderer.clear();
      renderer.render(scene.getScene(), camera);
      renderer.clearDepth();
      renderer.render(hud.getScene(), camera);
    }
    lastRender = Date.now();
  };

  function animate() {
    let delay = 50;
    setTimeout(function () {
      requestAnimationFrame(this.animate);
    }, delay);
    render();
  };

  this.rotatePressed = function () {
    controller.rotatePressed();
  }

  this.rotateReleased = function () {
    controller.rotateReleased();
  }

  this.setCursorStyle = function (cursorStyle) {
    domElement.style.cursor = cursorStyle;
  };

  this.updateWindowSize = function () {
    scope.heightMargin = scope.element.offset().top;
    scope.widthMargin = scope.element.offset().left;

    scope.elementWidth = scope.element.innerWidth();
    if (options.resize) {
      scope.elementHeight = window.innerHeight - scope.heightMargin;
    } else {
      scope.elementHeight = scope.element.innerHeight();
    }

    camera.aspect = scope.elementWidth / scope.elementHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(scope.elementWidth, scope.elementHeight);
    needsUpdate = true;
  }

  this.centerCamera = function () {
    let yOffset = 150.0;

    let pan = model.floorplan.getCenter();
    pan.y = yOffset;

    scope.controls.target = pan;

    let distance = model.floorplan.getSize().z * 1.5;

    let offset = pan.clone().add(
      new Vector3(0, distance, distance));
    // scope.controls.setOffset(offset);
    camera.position.copy(offset);

    scope.controls.update();
  }

  // projects the object's center point into x,y screen coords
  // x,y are relative to top left corner of viewer
  this.projectVector = function (vec3, ignoreMargin) {
    ignoreMargin = ignoreMargin || false;

    let widthHalf = scope.elementWidth / 2;
    let heightHalf = scope.elementHeight / 2;

    let vector = new Vector3();
    vector.copy(vec3);
    vector.project(camera);

    let vec2 = new Vector2();

    vec2.x = (vector.x * widthHalf) + widthHalf;
    vec2.y = -(vector.y * heightHalf) + heightHalf;

    if (!ignoreMargin) {
      vec2.x += scope.widthMargin;
      vec2.y += scope.heightMargin;
    }

    return vec2;
  }

  init();
}

export default Main;
