import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import model_path     from './assets/25_central_square.glb';

export default function loadModel() {
  const loader = new GLTFLoader();

  return loader.loadAsync(model_path)
    .then(gltf => gltf.scene);
}
