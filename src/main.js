import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import 'bootstrap/dist/css/bootstrap.min.css';
 
import model_path from './assets/toys.glb'

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({antialias: true, canvas}); // This calls what we pass requestAnimationFrame
const fov = 1;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 200;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 15;
camera.position.y = .02;


const scene = new THREE.Scene();
scene.background = new THREE.Color('gray');

scene.add(camera);

const color = 0xFFFFFF;
const intensity = 3;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

let choice = "";
let hovered = "";
let model = null;;

const loader = new GLTFLoader();

loader.load( model_path, function ( gltf ) {

  scene.add( gltf.scene );
  model = gltf.scene

}, undefined, function ( error ) {

  console.error( error );

} );

class PickHelper {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.pickedObject = null;
    }
    
    pick(normalizedPosition, scene, camera) {
        // restore the color if there is a picked object
        if (this.pickedObject) {

          this.pickedObject = undefined;
        }

        // cast a ray through the frustum
        this.raycaster.setFromCamera(normalizedPosition, camera);
        // get the list of objects the ray intersected
        const intersectedObjects = this.raycaster.intersectObjects(scene.children);
        if (intersectedObjects.length) {
          // pick the first object. It's the closest one
          this.pickedObject = intersectedObjects[0].object;
          
          return this.pickedObject;
        }
        
    }
}

const pickHelper = new PickHelper();



renderer.render(scene, camera);


function render(time) {
    time *= 0.001;  // convert time to seconds
    
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }    
    
    if (model) {
        model.rotation.y = time * 0.1;
        model.rotation.x = time * 0.1;
    }
    
    hovered = pickHelper.pick(pickPosition, scene, camera);
    if (choice) {
        document.getElementById("chosen-part").innerText = choice.name;
    }
    if (hovered) {
        document.getElementById("hover-part").innerText = hovered.name;
    }
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);


const pickPosition = {x: 0, y: 0};
clearPickPosition();



function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
}

function choose(event) {
    choice = pickHelper.pick(pickPosition, scene, camera);
    console.log(choice)
    
}

function clearPickPosition() {
  // unlike the mouse which always has a position
  // if the user stops touching the screen we want
  // to stop picking. For now we just pick a value
  // unlikely to pick something
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}


window.addEventListener('click', choose);
window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout', clearPickPosition);
window.addEventListener('mouseleave', clearPickPosition);

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
    renderer.setSize(width, height, false);
    }
    return needResize;
}

//mobile
window.addEventListener('touchstart', (event) => {
  // prevent the window from scrolling
  event.preventDefault();
  setPickPosition(event.touches[0]);
}, {passive: false});
 
window.addEventListener('touchmove', (event) => {
  setPickPosition(event.touches[0]);
  choose(event)
});
 
window.addEventListener('touchend', clearPickPosition);
