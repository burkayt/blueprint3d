import {
  ImageUtils,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three'
import Controller from './controller'
import Controls from './controls'
import HUD from './hud'
import Skybox from './skybox'
import Model from '../model/model'
import { Floorplan } from '../model/floorplan'
import Lights from './lights'

import FloorplanFunc from './floorplan'

let Main = function(
  model: Model,
  opts: any,
  element?: string,
  canvasElement?: string
) {
  let optins: any = {
    resize: true,
    pushHref: false,
    spin: true,
    spinSpeed: 0.00002,
    clickPan: true,
    canMoveFixedItems: false
  }

  // override with manually set options
  for (let opt in optins) {
    if (optins.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
      optins[opt] = opts[opt]
    }
  }

  let scene = model.scene

  let elem = $(element)
  let domElement: HTMLElement

  let camera: PerspectiveCamera
  let renderer: WebGLRenderer
  let controls: Controls
  let canvas
  let controller: any
  let floorplan: Function

  // var canvas;
  // var canvasElement = canvasElement;

  let needsUpdated = false

  let lastRender = Date.now()
  let mouseOver = false
  let hasClicked = false

  let hud: any

  let heightMargin: number | undefined
  let widthMargin: number | undefined
  let elementHeight: number | undefined
  let elementWidth: number | undefined
  let itemSelectedCallbacks = $.Callbacks() // item
  let itemUnselectedCallbacks = $.Callbacks()

  let wallClicked = $.Callbacks() // wall
  let floorClicked = $.Callbacks() // floor
  let nothingClicked = $.Callbacks()

  function init() {
    ImageUtils.crossOrigin = ''

    domElement = elem.get(0) // Container
    camera = new PerspectiveCamera(45, 1, 1, 10000)
    renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true // required to support .toDataURL()
    })
    renderer.autoClear = false
    renderer.shadowMap.enabled = true
    // renderer.shadowMap.Soft = true;
    renderer.shadowMap.type = PCFSoftShadowMap

    let skybox = Skybox(scene)

    controls = new Controls(camera, domElement)

    hud = HUD(Main)

    controller = Controller(Main, model, camera, element, controls, hud)

    domElement.appendChild(renderer.domElement)

    // handle window resizing
    updateWindowSize()
    if (optins.resize) {
      $(window).resize(updateWindowSize)
    }

    // setup camera nicely
    centerCamera()
    model.floorplan.fireOnUpdatedRooms(centerCamera)

    let lights = Lights(scene.getScene(), model.floorplan)

    floorplan = FloorplanFunc(scene, model.floorplan, controls)

    animate()

    elem
      .mouseenter(function() {
        mouseOver = true
      })
      .mouseleave(function() {
        mouseOver = false
      })
      .click(function() {
        hasClicked = true
      })

    // canvas = new this.ThreeCanvas(canvasElement, scope);
  }

  function spin() {
    if (optins.spin && !mouseOver && !hasClicked) {
      let theta = 2 * Math.PI * optins.spinSpeed * (Date.now() - lastRender)
      controls.rotateLeft(theta)
      controls.update()
    }
  }

  let dataUrl = function() {
    let dataUrl = renderer.domElement.toDataURL('image/png')
    return dataUrl
  }

  let stopSpin = function() {
    hasClicked = true
  }

  let options = function() {
    return optins
  }

  let getModel = function() {
    return model
  }

  let getScene = function() {
    return scene
  }

  let getController = function() {
    return controller
  }

  let getCamera = function() {
    return camera
  }

  let needsUpdate = function() {
    needsUpdated = true
  }

  function shouldRender() {
    // Do we need to draw a new frame
    if (
      controls.needsUpdate ||
      controller.needsUpdate ||
      needsUpdate ||
      model.scene.needsUpdate
    ) {
      controls.needsUpdate = false
      controller.needsUpdate = false
      needsUpdated = false
      model.scene.needsUpdate = false
      return true
    } else {
      return false
    }
  }

  function render() {
    spin()
    if (shouldRender()) {
      renderer.clear()
      renderer.render(scene.getScene(), camera)
      renderer.clearDepth()
      renderer.render(hud.getScene(), camera)
    }
    lastRender = Date.now()
  }

  function animate() {
    let delay = 50
    setTimeout(function() {
      requestAnimationFrame(animate)
    }, delay)
    render()
  }

  let rotatePressed = function() {
    controller.rotatePressed()
  }

  let rotateReleased = function() {
    controller.rotateReleased()
  }

  let setCursorStyle = function(cursorStyle: string) {
    domElement.style.cursor = cursorStyle
  }

  let updateWindowSize = function() {
    heightMargin = elem.offset()!.top
    widthMargin = elem.offset()!.left

    elementWidth = elem.innerWidth()
    if (optins.resize) {
      elementHeight = window.innerHeight - heightMargin
    } else {
      elementHeight = elem.innerHeight()
    }

    if (elementWidth && elementHeight) {
      camera.aspect = elementWidth / elementHeight
      camera.updateProjectionMatrix()

      renderer.setSize(elementWidth, elementHeight)
    }
    needsUpdated = true
  }

  let centerCamera = function() {
    let yOffset = 150.0

    let pan = model.floorplan.getCenter()
    pan.y = yOffset

    controls.target = pan

    let distance = model.floorplan.getSize().z * 1.5

    let offset = pan.clone().add(new Vector3(0, distance, distance))
    // controls.setOffset(offset);
    camera.position.copy(offset)

    controls.update()
  }

  // projects the object's center point into x,y screen coords
  init()

  // x,y are relative to top left corner of viewer
  let projectVector = function(vec3: Vector3, ignoreMargin: boolean) {
    ignoreMargin = ignoreMargin || false

    let widthHalf
    let heightHalf
    if (elementWidth && elementHeight) {
      widthHalf = elementWidth / 2
      heightHalf = elementHeight / 2
    }

    let vector = new Vector3()
    vector.copy(vec3)
    vector.project(camera)

    let vec2 = new Vector2()

    if (widthHalf && heightHalf) {
      vec2.x = vector.x * widthHalf + widthHalf
      vec2.y = -(vector.y * heightHalf) + heightHalf
    }

    if (!ignoreMargin && widthMargin && heightMargin) {
      vec2.x += widthMargin
      vec2.y += heightMargin
    }

    return vec2
  }
}

export default Main
