import {
  CylinderGeometry,
  Geometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Scene,
  SphereGeometry,
  Vector3
} from 'three';

/**
 * Drawings on "top" of the scene. e.g. rotate arrows
 */
function HUD(three: any) {
  let scope = this;
  let scene = new Scene();

  let selectedItem: any = null;

  let rotating = false;
  let mouseover = false;

  let tolerance = 10;
  let height = 5;
  let distance = 20;
  let color = "#ffffff";
  let hoverColor = "#f1c40f";

  let activeObject: any = null;

  this.getScene = function () {
    return scene;
  }

  this.getObject = function () {
    return activeObject;
  }

  function init() {
    three.itemSelectedCallbacks.add(itemSelected);
    three.itemUnselectedCallbacks.add(itemUnselected);
  }

  function resetSelectedItem() {
    selectedItem = null;
    if (activeObject) {
      scene.remove(activeObject);
      activeObject = null;
    }
  }

  function itemSelected(item) {
    if (selectedItem != item) {
      resetSelectedItem();
      if (item.allowRotate && !item.fixed) {
        selectedItem = item;
        activeObject = makeObject(selectedItem);
        scene.add(activeObject);
      }
    }
  }

  function itemUnselected() {
    resetSelectedItem();
  }

  this.setRotating = function (isRotating) {
    rotating = isRotating;
    setColor();
  }

  this.setMouseover = function (isMousedOver) {
    mouseover = isMousedOver;
    setColor();
  }

  function setColor() {
    if (activeObject) {
      activeObject.children.forEach((obj) => {
        obj.material.color.set(getColor());
      });
    }
    three.needsUpdate();
  }

  function getColor() {
    return (mouseover || rotating) ? hoverColor : color;
  }

  this.update = function () {
    if (activeObject) {
      activeObject.rotation.y = selectedItem.rotation.y;
      activeObject.position.x = selectedItem.position.x;
      activeObject.position.z = selectedItem.position.z;
    }
  }

  function makeLineGeometry(item) {
    let geometry = new Geometry();

    geometry.vertices.push(
      new Vector3(0, 0, 0),
      rotateVector(item)
    );

    return geometry;
  }

  function rotateVector(item) {
    let vec = new Vector3(0, 0,
      Math.max(item.halfSize.x, item.halfSize.z) + 1.4 + distance);
    return vec;
  }

  function makeLineMaterial(rotating) {
    let mat = new LineBasicMaterial({
      color: getColor(),
      linewidth: 3
    });
    return mat;
  }

  function makeCone(item) {
    let coneGeo = new CylinderGeometry(5, 0, 10);
    let coneMat = new MeshBasicMaterial({
      color: getColor()
    });
    let cone = new Mesh(coneGeo, coneMat);
    cone.position.copy(rotateVector(item));

    cone.rotation.x = -Math.PI / 2.0;

    return cone;
  }

  function makeSphere(item) {
    let geometry = new SphereGeometry(4, 16, 16);
    let material = new MeshBasicMaterial({
      color: getColor()
    });
    let sphere = new Mesh(geometry, material);
    return sphere;
  }

  function makeObject(item) {
    let object = new Object3D();
    let line = new LineSegments(
      makeLineGeometry(item),
      makeLineMaterial(scope.rotating));

    let cone = makeCone(item);
    let sphere = makeSphere(item);

    object.add(line);
    object.add(cone);
    object.add(sphere);

    object.rotation.y = item.rotation.y;
    object.position.x = item.position.x;
    object.position.z = item.position.z;
    object.position.y = height;

    return object;
  }

  init();
}

export default HUD;
