//var CAPSTONE = (function() {
//    var constr = function() {
//        this.sceneItems = {};
//        this.userPosition = new THREE.Vector3(0, 10, 0);
//        this.scene = null;
//        this.renderer = null;
//        this.camera = null;
//        this.vrControls = null;
//        this.vrEffect = null;
//
//        this.initScene();
//    };
//
//    const.prototype.initScene = function() {
//
//    }
//
//}());

/*
Make socket connection with server
 */
var socket = io();
var USER_ID = null;


socket.on('new user', function(state) {
    console.log('New Client User Registered');
    console.log(state);
    USER_ID = state.user_id;
});

socket.on('object moved', function(state) {
    console.log("Received object moved");
    console.log(state);
    switch(state.type) {
        case "rotational":
            cube.rotation.set(state.state.x, state.state.y, state.state.z);
            break;
    }
});

/*
Setup three.js WebGL renderer
*/
var renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize(window.innerWidth, window.innerHeight);

/*
Append the canvas element created by the renderer to document body element.
*/
document.body.appendChild( renderer.domElement );

/*
Create a three.js scene
*/
var scene = new THREE.Scene();

/*
Create a three.js camera
*/
var camera = new THREE.PerspectiveCamera( 150, window.innerWidth / window.innerHeight, 1, 10000 );
camera.position.set(0,10, 0);

/*
Apply VR headset positional data to camera
If testState is null then no VR device was detected and we set VR_ENABLED to false.
*/
var controls, cube, effect;
controls = new THREE.VRControls( camera );

effect = new THREE.VREffect( renderer );
effect.setSize( window.innerWidth, window.innerHeight );

function initScene() {
    /*
     Create 3d objects
     */
    var geometry = new THREE.BoxGeometry( 10, 10, 10 );

    var material = new THREE.MeshNormalMaterial();

    cube = new THREE.Mesh( geometry, material );

    /*
     Position cube mesh
     */
    cube.position.set(0, 10, -20);

    /*
     Add cube mesh to your three.js scene
     */
    scene.add( cube );

    camera.lookAt(cube.position);

    /*
     Floor
     */

    var floorTexture = THREE.ImageUtils.loadTexture("img/wood-floor.jpg");
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(200,200);
    var plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial({ map: floorTexture}));
    plane.position.set(0, 0, 0);
    plane.overdraw = true;
    plane.material.side = THREE.DoubleSide;
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    /*
     Light
     */
    var light = new THREE.PointLight( 0xffffff, 2.5, 150);
    light.position.set(0,20,0);
    scene.add(light);

    /*
     Fog
     */
    scene.fog = new THREE.FogExp2(0x111111, .03);//, 10);
}

/*
Request animation frame loop function
*/
function animate() {
    /*
    Apply rotation to cube mesh
    */
    cube.rotation.y += 0.01;

    /*
    Update VR headset position and apply to camera.
    */
    try {
        controls.update();
    } catch(err) {
        console.log("Error updating controls");
    }

    /*
    Render the scene through the VREffect.
    */
    effect.render( scene, camera );

    requestAnimationFrame( animate );
}

initScene();

/*
Kick off animation loop
*/
animate();

/*
Object manipulation
*/

function rotate(obj, axis, inc) {
    switch(axis) {
        case "X":
            obj.rotation.x += inc * .1;
            break;
        case "Y":
            obj.rotation.y += inc * .1;
            break;
    }
    socket.emit('object moved', {
            type: "rotational",
            state: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z}
    });
}



/*
Listen for double click event to enter full-screen VR mode
*/
document.body.addEventListener( 'dblclick', function() {
    effect.setFullScreen( true );
});

/*
Listen for keyboard event and zero positional sensor on appropriate keypress.
*/
function onkey(event) {

    switch (event.keyCode) {
        case 13:
            event.preventDefault();
            console.log("Selecting Item");
            break;
        case 32:
            event.preventDefault();
            console.log("Create Mode");
            break;
        case 67:
            event.preventDefault();
            console.log("Color Mode");
            break;
        case 68:
            event.preventDefault();
            console.log("Depth Mode");
            break;
        case 77:
            event.preventDefault();
            console.log("Move Mode");
            break;
        case 82:
            event.preventDefault();
            console.log("Rotate Mode X");
            rotate(cube, "X", 1);
            break;
        case 84:
            event.preventDefault();
            console.log("Rotate Mode Y");
            rotate(cube, "Y", 1);
            break;
        case 90:
            event.preventDefault();
            controls.zeroSensor();
            break;
    }
};

window.addEventListener("keydown", onkey, true);

/*
Handle window resizes
*/
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    effect.setSize( window.innerWidth, window.innerHeight );
}

window.addEventListener( 'resize', onWindowResize, false );