import {
  Camera,
  Intersection,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Raycaster,
  Vector2,
  Vector3
} from 'three';
import {Scene} from '../model/scene';
import {Model} from '../model/model';
import {Item} from '../items/item';
import {Utils} from '../core/utils';


export let Controller: any = function (three: any, model: Model, camera: Camera, element: any, controls: any, hud: any) {

  let scope = Controller;

  scope.enabled = true;

  let scene: Scene = model.scene;

  let plane: Mesh; // ground plane used for intersection testing

  let mouse: Vector2;
  let intersectedObject: Item | null;
  let mouseoverObject: Item | null;
  let selectedObject: Item | null;

  let mouseDown = false;
  let mouseMoved = false; // has mouse moved since down click

  let rotateMouseOver = false;

  let states = {
    UNSELECTED: 0, // no object selected
    SELECTED: 1, // selected but inactive
    DRAGGING: 2, // performing an action while mouse depressed
    ROTATING: 3,  // rotating with mouse down
    ROTATING_FREE: 4, // rotating with mouse up
    PANNING: 5
  };
  let state = states.UNSELECTED;

  scope.needsUpdate = true;

  function init() {
    element.mousedown(mouseDownEvent);
    element.mouseup(mouseUpEvent);
    element.mousemove(mouseMoveEvent);

    mouse = new Vector2();

    scene.itemRemovedCallbacks.add(itemRemoved);
    scene.itemLoadedCallbacks.add(itemLoaded);
    setGroundPlane();
  }

  // invoked via callback when item is loaded
  function itemLoaded(item: any) {
    if (!item.positionSet) {
      scope.setSelectedObject(item);
      switchState(states.DRAGGING);
      let pos = item.position.clone();
      pos.y = 0;
      let vec = three.projectVector(pos);
      clickPressed(vec);
    }
    item.positionSet = true;
  }

  function clickPressed(vec2?: Vector2) {
    vec2 = vec2 || mouse;
    let intersection = scope.itemIntersection(mouse, selectedObject);
    if (intersection && selectedObject) {
      selectedObject.clickPressed(intersection);
    }
  }

  function clickDragged(vec2?: Vector2) {
    vec2 = vec2 || mouse;
    let intersection = scope.itemIntersection(mouse, selectedObject);
    if (intersection && selectedObject) {
      if (scope.isRotating()) {
        selectedObject.rotate(intersection);
      } else {
        selectedObject.clickDragged(intersection);
      }
    }
  }

  function itemRemoved(item: Item) {
    // invoked as a callback to event in Scene
    if (item === selectedObject) {
      selectedObject.setUnselected();
      selectedObject.mouseOff();
      scope.setSelectedObject(null);
    }
  }

  function setGroundPlane() {
    // ground plane used to find intersections
    let size = 10000;
    plane = new Mesh(
      new PlaneGeometry(size, size),
      new MeshBasicMaterial());
    plane.rotation.x = -Math.PI / 2;
    plane.visible = false;
    scene.add(plane);
  }

  function checkWallsAndFloors(event?: any) {

    // double click on a wall or floor brings up texture change modal
    if (state === states.UNSELECTED && mouseoverObject == null) {
      // check walls
      let wallEdgePlanes = model.floorplan.wallEdgePlanes();
      let wallIntersects = scope.getIntersections(
        mouse, wallEdgePlanes, true);
      if (wallIntersects.length > 0) {
        let wall = wallIntersects[0].object.edge;
        three.wallClicked.fire(wall);
        return;
      }

      // check floors
      let floorPlanes = model.floorplan.floorPlanes();
      let floorIntersects = scope.getIntersections(
        mouse, floorPlanes, false);
      if (floorIntersects.length > 0) {
        let room = floorIntersects[0].object.room;
        three.floorClicked.fire(room);
        return;
      }

      three.nothingClicked.fire();
    }

  }

  function mouseMoveEvent(event: any) {
    if (scope.enabled) {
      event.preventDefault();

      mouseMoved = true;

      mouse.x = event.clientX;
      mouse.y = event.clientY;

      if (!mouseDown) {
        updateIntersections();
      }

      switch (state) {
        case states.UNSELECTED:
          updateMouseover();
          break;
        case states.SELECTED:
          updateMouseover();
          break;
        case states.DRAGGING:
        case states.ROTATING:
        case states.ROTATING_FREE:
          clickDragged();
          hud.update();
          scope.needsUpdate = true;
          break;
      }
    }
  }

  scope.isRotating = function () {
    return (state === states.ROTATING || state === states.ROTATING_FREE);
  };

  function mouseDownEvent(event: Event) {
    if (scope.enabled) {
      event.preventDefault();

      mouseMoved = false;
      mouseDown = true;

      switch (state) {
        case states.SELECTED:
          if (rotateMouseOver) {
            switchState(states.ROTATING);
          } else if (intersectedObject != null) {
            scope.setSelectedObject(intersectedObject);
            if (!intersectedObject.fixed) {
              switchState(states.DRAGGING);
            }
          }
          break;
        case states.UNSELECTED:
          if (intersectedObject != null) {
            scope.setSelectedObject(intersectedObject);
            if (!intersectedObject.fixed) {
              switchState(states.DRAGGING);
            }
          }
          break;
        case states.DRAGGING:
        case states.ROTATING:
          break;
        case states.ROTATING_FREE:
          switchState(states.SELECTED);
          break;
      }
    }
  }

  function mouseUpEvent(event: Event) {
    if (scope.enabled && selectedObject) {
      mouseDown = false;

      switch (state) {
        case states.DRAGGING:
          selectedObject.clickReleased();
          switchState(states.SELECTED);
          break;
        case states.ROTATING:
          if (!mouseMoved) {
            switchState(states.ROTATING_FREE);
          } else {
            switchState(states.SELECTED);
          }
          break;
        case states.UNSELECTED:
          if (!mouseMoved) {
            checkWallsAndFloors();
          }
          break;
        case states.SELECTED:
          if (intersectedObject == null && !mouseMoved) {
            switchState(states.UNSELECTED);
            checkWallsAndFloors();
          }
          break;
        case states.ROTATING_FREE:
          break;
      }
    }
  }

  function switchState(newState: any) {
    if (newState !== state) {
      onExit(state);
      onEntry(newState);
    }
    state = newState;
    hud.setRotating(scope.isRotating());
  }

  function onEntry(state: any) {
    switch (state) {
      case states.UNSELECTED:
        scope.setSelectedObject(null);
        break; // TODO Test ben ekledim.
      case states.SELECTED:
        controls.enabled = true;
        break;
      case states.ROTATING:
      case states.ROTATING_FREE:
        controls.enabled = false;
        break;
      case states.DRAGGING:
        three.setCursorStyle("move");
        clickPressed();
        controls.enabled = false;
        break;
    }
  }

  function onExit(state: any) {
    switch (state) {
      case states.UNSELECTED:
      case states.SELECTED:
        break;
      case states.DRAGGING:
        if (mouseoverObject) {
          three.setCursorStyle("pointer");
        } else {
          three.setCursorStyle("auto");
        }
        break;
      case states.ROTATING:
      case states.ROTATING_FREE:
        break;
    }
  }

  scope.selectedObject = function () {
    return selectedObject;
  };

  // updates the vector of the intersection with the plane of a given
  // mouse position, and the intersected object
  // both may be set to null if no intersection found
  function updateIntersections() {

    // check the rotate arrow
    let hudObject = hud.getObject();
    if (hudObject != null) {
      let hudIntersects = scope.getIntersections(
        mouse,
        hudObject,
        false, false, true);
      if (hudIntersects.length > 0) {
        rotateMouseOver = true;
        hud.setMouseover(true);
        intersectedObject = null;
        return;
      }
    }
    rotateMouseOver = false;
    hud.setMouseover(false);

    // check objects
    let items = model.scene.getItems();
    let intersects = scope.getIntersections(
      mouse,
      items,
      false, true);

    if (intersects.length > 0) {
      intersectedObject = intersects[0].object;
    } else {
      intersectedObject = null;
    }
  }

  // sets coords to -1 to 1
  function normalizeVector2(vec2: Vector2) {
    let retVec = new Vector2();
    retVec.x = ((vec2.x - three.widthMargin) / (window.innerWidth - three.widthMargin)) * 2 - 1;
    retVec.y = -((vec2.y - three.heightMargin) / (window.innerHeight - three.heightMargin)) * 2 + 1;
    return retVec;
  }

  //
  function mouseToVec3(vec2: Vector2) {
    let normVec2 = normalizeVector2(vec2);
    let vector = new Vector3(
      normVec2.x, normVec2.y, 0.5);
    vector.unproject(camera);
    return vector;
  }

  // returns the first intersection object
  scope.itemIntersection = function (vec2: Vector2, item: Item) {
    let customIntersections = item.customIntersectionPlanes();
    let intersections = null;
    if (customIntersections && customIntersections.length > 0) {
      intersections = this.getIntersections(vec2, customIntersections, true);
    } else {
      intersections = this.getIntersections(vec2, plane);
    }
    if (intersections.length > 0) {
      return intersections[0];
    } else {
      return null;
    }
  };

  // filter by normals will only return objects facing the camera
  // objects can be an array of objects or a single object
  scope.getIntersections = function (vec2: Vector2, objects: Object3D, filterByNormals: boolean, onlyVisible: boolean, recursive: boolean, linePrecision: number) {

    let vector = mouseToVec3(vec2);

    onlyVisible = onlyVisible || false;
    filterByNormals = filterByNormals || false;
    recursive = recursive || false;
    linePrecision = linePrecision || 20;


    let direction = vector.sub(camera.position).normalize();
    let raycaster = new Raycaster(
      camera.position,
      direction);
    raycaster.linePrecision = linePrecision;
    let intersections;
    if (objects instanceof Array) {
      intersections = raycaster.intersectObjects(objects, recursive);
    } else {
      intersections = raycaster.intersectObject(objects, recursive);
    }
    // filter by visible, if true
    if (onlyVisible) {
      intersections = Utils.removeIf(intersections, function (intersection: Intersection) {
        return !intersection.object.visible;
      });
    }

    // filter by normals, if true
    if (filterByNormals) {
      intersections = Utils.removeIf(intersections, function (intersection: Intersection) {
        let dot = intersection.face.normal.dot(direction);
        return (dot > 0)
      });
    }
    return intersections;
  };

  // manage the selected object
  scope.setSelectedObject = function (object: Item) {
    if (state === states.UNSELECTED) {
      switchState(states.SELECTED);
    }
    if (selectedObject != null) {
      selectedObject.setUnselected();
    }
    if (object != null) {
      selectedObject = object;
      selectedObject.setSelected();
      three.itemSelectedCallbacks.fire(object);
    } else {
      selectedObject = null;
      three.itemUnselectedCallbacks.fire();
    }
    this.needsUpdate = true;
  }

  // TODO: there MUST be simpler logic for expressing this
  function updateMouseover() {
    if (intersectedObject != null) {
      if (mouseoverObject != null) {
        if (mouseoverObject !== intersectedObject) {
          mouseoverObject.mouseOff();
          mouseoverObject = intersectedObject;
          mouseoverObject.mouseOver();
          scope.needsUpdate = true;
        } else {
          // do nothing, mouseover already set
        }
      } else {
        mouseoverObject = intersectedObject;
        mouseoverObject.mouseOver();
        three.setCursorStyle("pointer");
        scope.needsUpdate = true;
      }
    } else if (mouseoverObject != null) {
      mouseoverObject.mouseOff();
      three.setCursorStyle("auto");
      mouseoverObject = null;
      scope.needsUpdate = true;
    }
  }

  init();
}

