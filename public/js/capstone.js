var CAPSTONE = (function() {
    'use strict';

    var Modes = {
        INCOMPATIBLE: 1,
        COMPATIBLE: 2,
        VR: 3
    };


    var constr = function(width, height) {
        this.width = width;
        this.height = height;
        this.sceneItems = [];
        this.userPosition = new THREE.Vector3(0, 10, 0);
        this.userObject = new THREE.Mesh(
                new THREE.SphereGeometry(5, 32, 32),
                new THREE.MeshBasicMaterial({color: 0xffffff})
            );
        this.foreignUsers = [];
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.vrControls = null;
        this.vrEffect = null;
        this.pointerLockControls = null;
        this.blocker = null;
        this.instructions = null;
        this.controlsEnabled = false;
        this.socket = null;
        this.userId = null;
        this.raycaster = null;
        this.facerod = null;
        this.selectedObject = null;
        this.selectedObjectData = {distance: 15};
        this.selectedUpdateInterval = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.prevTime = performance.now();

        this.projector = new THREE.Projector();

        this.getHMD().then(function(hmd) {
            if (hmd) {
                this.activateVR();
            } else {
                this.activateImmersive();
            }
            this.defaultMode = hmd ? Modes.COMPATIBLE : Modes.INCOMPATIBLE;
            this.setMode(this.defaultMode);
        }.bind(this));

        this.initScene();
        this.initSocket();
    };

    constr.prototype.setMode = function(mode) {
        this.mode = mode;
    };

    constr.prototype.activateVR = function() {
        // Enter VR mode on a double click
        window.addEventListener('dblclick', this.enterVR.bind(this));
    };

    constr.prototype.enterVR = function() {
        console.log("Entering VR");
        this.effect.setFullScreen(true);
        this.requestOrientationLock();
        this.setMode(Modes.VR);
    };

    constr.prototype.exitVR = function() {
        console.log('Exiting VR');
        this.effect.setFullScreen(false);
        this.releaseOrientationLock();
        this.effect.setSize(window.innerWidth, window.innerHeight);
        this.setMode(this.defaultMode);
    };

    constr.prototype.toggleVRMode = function() {
        if (!this.isVRMode()) {
            // Enter VR mode.
            this.enterVR();
        } else {
            this.exitVR();
        }
    };

    constr.prototype.requestOrientationLock = function() {
        if (screen.orientation) {
            screen.orientation.lock('landscape')
        }
    };

    constr.prototype.releaseOrientationLock = function() {
        if (screen.orientation) {
            screen.orientation.unlock();
        }
    };

    constr.prototype.activateImmersive = function() {
        window.addEventListener('dblclick', this.enterImmersive.bind(this));
    };

    constr.prototype.enterImmersive = function() {
        this.requestPointerLock();
        this.requestFullScreen();
    };

    constr.prototype.requestPointerLock = function() {
        var canvas = this.renderer.domElement;
        //canvas.requestPointerLock = canvas.requestPointerLock ||
        //    canvas.mozRequestPointerLock ||
        //    canvas.webkitRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    };

    constr.prototype.requestFullscreen = function() {
        var canvas = this.renderer.domElement;
        if (canvas.mozRequestFullScreen) {
            canvas.mozRequestFullScreen();
        } else if (canvas.webkitRequestFullscreen) {
            canvas.webkitRequestFullscreen();
        } else if (canvas.requestFullscreen) {
            canvas.requestFullscreen();
        }
    };

    constr.prototype.isVRMode = function() {
        //return this.mode == Modes.VR;
        return this.mode == Modes.COMPATIBLE;
    };

    constr.prototype.getHMD = function() {
        return new Promise(function(resolve, reject) {
            try {
                navigator.getVRDevices().then(function(devices) {
                    for (var i = 0; i < devices.length; i++) {
                        if (devices[i] instanceof HMDVRDevice) {
                            resolve(devices[i]);
                            break;
                        }
                    }
                    resolve(null);
                }, function() {
                    resolve(null);
                });
            } catch(err) {
                resolve(null);
            }
        });
    };

    constr.prototype.getPointerlock = function() {
        var element = document.body;
        var that = this;

        var pointerlockchange = function ( event ) {

            if ( document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element ) {

                that.controlsEnabled = true;
                //that.pointerLockControls.enabled = true;

                that.blocker.style.display = 'none';

            } else {

                //that.pointerLockControls.enabled = false;

                that.blocker.style.display = '-webkit-box';
                that.blocker.style.display = '-moz-box';
                that.blocker.style.display = 'box';

                that.instructions.style.display = '';

            }

        }

        var pointerlockerror = function ( event ) {

            that.instructions.style.display = '';

        };

        // Hook pointer lock state change events
        document.addEventListener( 'pointerlockchange', pointerlockchange, false );
        document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
        document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

        document.addEventListener( 'pointerlockerror', pointerlockerror, false );
        document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
        document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

        this.instructions.addEventListener( 'click', function ( event ) {

            that.instructions.style.display = 'none';

            // Ask the browser to lock the pointer
            element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;

            if ( /Firefox/i.test( navigator.userAgent ) ) {

                var fullscreenchange = function ( event ) {

                    if ( document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element ) {

                        document.removeEventListener( 'fullscreenchange', fullscreenchange );
                        document.removeEventListener( 'mozfullscreenchange', fullscreenchange );

                        element.requestPointerLock();
                    }

                }

                document.addEventListener( 'fullscreenchange', fullscreenchange, false );
                document.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

                element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;

                element.requestFullscreen();

            } else {

                element.requestPointerLock();

            }

        }, false );
    };

    constr.prototype.initScene = function () {
        this.blocker = document.getElementById( 'blocker' );
        this.instructions = document.getElementById( 'instructions' );

        /*
         Setup three.js WebGL renderer
         */
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        //this.renderer.setSize(this.width, this.height);

        /*
         Append the canvas element created by the renderer to document body element.
         */
        document.body.appendChild( this.renderer.domElement );

        this.raycaster = new THREE.Raycaster();

        /*
         Create a three.js scene
         */
        this.scene = new THREE.Scene();

        /*
         Create a three.js camera
         */
        this.camera = new THREE.PerspectiveCamera( 75, this.width / this.height, 1, 10000 );
        this.camera.position.set(0,10, 0);

        var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
        if ( havePointerLock ) {
            this.getPointerlock();
        } else {
            this.instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
        }

        /*
         Apply VR headset positional data to camera
         If testState is null then no VR device was detected and we set VR_ENABLED to false.
         */
        this.controls = new THREE.VRControls( this.camera );

        this.effect = new THREE.VREffect( this.renderer );
        this.effect.setSize( this.width, this.height );

        //$('body').append('<div id="hud"><p>Health: <span id="health">100</span><br />Score: <span id="score">0</span></p></div>');
        //$('#hud').css('position', 'absolute');
        //$('#hud').css('z-index', '9999');
        //$('#hud').css('z-bottom', '0');

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
        this.scene.add(plane);

        /*
         Face rod
         */
        //this.facerod = new THREE.Mesh(
        //    new THREE.BoxGeometry(.1,.1, 60),
        //    new THREE.MeshBasicMaterial({
        //        color: 0xff0000
        //    })
        //);
        //this.scene.add(this.facerod);

        /*
         Sky
         */
        var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(200, 32, 32),
            new THREE.MeshBasicMaterial({
                map: THREE.ImageUtils.loadTexture('img/rooftop.jpg')
            })
        );
        sphere.scale.x = -1;
        this.scene.add(sphere);

        /*
         Light
         */
        var light = new THREE.PointLight( 0xffffff, 2.5, 150);
        light.position.set(0,20,0);
        this.scene.add(light);

        /*
         Fog
         */
        //this.scene.fog = new THREE.FogExp2(0x111111, .03);

        /*
         Override this.scene.add so that when you add to scene you also add to
         the internal sceneItems datastructure
         */
        var oldAdd = this.scene.add;
        this.scene.add = function(obj, is_user) {

            if (is_user === true) {
                oldAdd.call(this.scene, obj);
            } else {
                this.sceneItems.push(obj);
                oldAdd.call(this.scene, obj);
            }
        }.bind(this);

        /*
         Create 3d objects
         */
        //var geometry = new THREE.BoxGeometry( 10, 10, 10 );
        //
        ////var material = new THREE.MeshNormalMaterial();
        //var material = new THREE.MeshBasicMaterial({color: 0xffffff});
        //
        //var cube = new THREE.Mesh( geometry, material );
        //
        //
        //var geometry2 = new THREE.BoxGeometry( 5, 5, 5 );
        ////var material = new THREE.MeshNormalMaterial();
        //var material2 = new THREE.MeshBasicMaterial({color: 0xffffff});
        //var cube2 = new THREE.Mesh( geometry2, material2 );
        //
        ///*
        // Position cube mesh
        // */
        //cube.position.set(0, 10, -20);
        //cube2.position.set(0, 10, -40);
        //
        ///*
        // Add cube mesh to your three.js scene
        // */
        //this.scene.add( cube );
        //this.scene.add(cube2);

        this.camera.lookAt({x: 10, y: 10, z: 10});

    };

    constr.prototype.initSocket = function() {

        /*
        Initiate socket connection
         */
        this.socket = io();
        var that = this;

        this.socket.on('new user', function(state) {
            console.log('New Client User Registered');
            console.log(state);
            // We are first logging in to create the world from the servers internal state
            that.createWorldFromState(state);
            that.userId = state.userId;
            that.socket.emit('user joined', {
                userId: that.userId,
                position: that.camera.position
            });
        });

        this.socket.on('object moved', function(state) {
            console.log("Received object moved");
            console.log(state);
            that.updateItemPositionWithState(state);

        });

        this.socket.on('foreign object created', function(state) {
            console.log("Foreign Object created");
            that.createForeignItem(state);
        });

        this.socket.on('user moved', function(state) {
            console.log('User moved with id: ' + state.userId);
            that.updateUserPositionWithState(state);
        });

        this.socket.on('user joined', function(state) {
            console.log("New user joined with id: " + state.userId);
            if (state.userId != that.userId) {
                that.createUserObject(state)
            }
        });

        this.socket.on('user left', function(state) {
            console.log("User left with id: " + state.userId);
            that.removeUser(state.userId);
        });

        this.socket.on('foreign object removed', function(state) {
            console.log("Foreigner removed object");
            that.foreignerRemovedObject(state);
        });

        this.socket.on('disconnect', function(state) {
            console.log('disconnect');
        });
    };

    constr.prototype.removeUser = function(uid) {
        for (var i = 0; i < this.foreignUsers.length; i++) {
            var u = this.foreignUsers[i];
            if (u.userId == uid) {
                this.scene.remove(u.object);
                break;
            }
        }
    };

    constr.prototype.createUserObject = function(state) {
        // Treat a user as a sphere in the world right now
        var geometry = new THREE.SphereGeometry( 2, 32, 32 );
        var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
        var userObj = new THREE.Mesh( geometry, material );
        userObj.position.set(state.position.x, state.position.y, state.position.z);
        // The true tells scene that this is a user and not to add to sceneItems
        this.scene.add(userObj, true);
        this.foreignUsers.push({userId: state.userId, object: userObj});
    };

    constr.prototype.createSceneItem = function(state, is_foreign) {
        var item = null;
        switch(state.type) {
            case 'box':
                var geometry = new THREE.BoxGeometry(state.params.width, state.params.height, state.params.depth);
                var material = new THREE.MeshBasicMaterial({color: state.color});
                item = new THREE.Mesh(geometry, material);
                item.position.set(state.position.x, state.position.y, state.position.z);
                item.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z, 'XYZ');
                item.scale.x = state.scale.x;
                item.scale.y = state.scale.y;
                item.scale.z = state.scale.z;
                break;
        }
        if (is_foreign) {
            item.name = state.name;
        } else {
            // We are creating the object in our world so create a name
            item.name = this.generateUUID();
            this.socket.emit('object created', this.serializeItem(item));
        }
        this.scene.add(item);
        return item;
    };

    constr.prototype.createForeignItem = function(state) {
        this.createSceneItem(state, true);
    };

    constr.prototype.createWorldFromState = function (state) {
        var users = state.currentSceneState.users;
        var items = state.currentSceneState.sceneItems;
        for (var u = 0; u < users.length; u++) {
            var t = users[u];
            if (t.userId != this.userId) {
                this.createUserObject(t);
            }
        }
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            this.createSceneItem(item, true);
        }
    };

    constr.prototype.serializeItem = function(item) {
        var res = {};
        var rot = {x: item.rotation._x, y: item.rotation._y, z: item.rotation._z};
        if (item.geometry instanceof THREE.BoxGeometry) {
            res = {
                name: item.name,
                type: 'box',
                position: item.position,
                params: item.geometry.parameters,
                rotation: rot,
                color: item.material.color,
                scale: item.scale
            }
        }
        return res;
    };

    constr.prototype.updateUserPositionWithState = function (state) {
        var userObj = null;
        for (var i = 0; i < this.foreignUsers.length; i++) {
            var o = this.foreignUsers[i];
            if (o.userId === state.userId) {
                userObj = o;
                break;
            }
        }
        // We found the correct user object so now update his position
        userObj.object.position.set(state.position.x, state.position.y, state.position.z);
    };

    constr.prototype.updateItemPositionWithState = function(state) {
        var item = null;
        for (var i = 0; i < this.sceneItems.length; i++) {
            var o = this.sceneItems[i];
            if (o.name == state.name) {
                item = o;
            }
        }
        item.position.set(state.position.x, state.position.y, state.position.z);
        item.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
        item.scale.set(state.scale.x, state.scale.y, state.scale.z);
    };

    constr.prototype.updateHUD = function() {
        var typeElems = $('.type-value');
        for (var i = 0; i < typeElems.length; i++) {
            var e1 = typeElems[i];
            var value = "";
            if (this.selectedObject.geometry instanceof THREE.BoxGeometry) {
                value = "Box"
            }
            e1.innerHTML = value;
        }
        var sizeElems = $('.size-value');
        for (var s = 0; s < sizeElems.length; s++) {
            var e5 = sizeElems[s];
            //console.log( box.min, box.max, box.size() );
            var v5 = "[H: " + this.selectedObject.scale.x + ", W: " + this.selectedObject.scale.y + ", D: " + this.selectedObject.scale.z + "]";
            e5.innerHTML = v5;
        }
        var positionElems = $('.position-value');
        for (var p = 0; p < positionElems.length; p++) {
            var e2 = positionElems[p];
            var v2 = "[x: " + this.selectedObject.position.x.toFixed(1) + ", y: " + this.selectedObject.position.y.toFixed(1) + ", z: " + this.selectedObject.position.z.toFixed(1) + "]";
            e2.innerHTML = v2;
        }
        var rotationElems = $('.rotation-value');
        for (var r = 0; r < rotationElems.length; r++) {
            var e3 = rotationElems[r];
            var v3 = "[x: " + Math.abs((this.selectedObject.rotation.x*(360/Math.PI) % 360).toFixed(1)) + ", y: " + Math.abs((this.selectedObject.rotation.y*(360/Math.PI) % 360).toFixed(1)) + ", z: " + Math.abs((this.selectedObject.rotation.z*(360/Math.PI) % 360).toFixed(1)) + "]";
            e3.innerHTML = v3;
        }
        var colorElems = $('.color-value');
        for (var c = 0; c < colorElems.length; c++) {
            var e4 = colorElems[c];
            var v4 = this.selectedObject.material.color.toString();
            e4.innerHTML = v4;
        }

    };

    constr.prototype.sceneState = function() {
        return this.sceneItems;
    };

    constr.prototype.getIntersects = function() {
        //console.log("Camera Position: " + this.camera.position.x + ", " + this.camera.position.y + ", " + this.camera.position.z);

        // Create the direction vector for our HMD
        var vector = new THREE.Vector3(0,0,-1);
        vector.applyQuaternion(this.camera.quaternion);

        // Create a ray caster and apply the direction vector originatinf from the camera's position
        var raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, vector);

        // Get the intersecting objects from our raycaster
        var intersects = raycaster.intersectObjects(this.sceneItems);
        //console.log(intersects);

        // Turn all non intersecting objects white.
        for (var j = 0; j < this.sceneItems.length; j++) {
            var ob = this.sceneItems[j];
            ob.material.color.setRGB(255, 255, 255);
        }

        // Turn all intersecting objects red.
        for( var i = 0; i < intersects.length; i++) {
            var obj = intersects[i].object;
            console.log(Object.getOwnPropertyNames(obj.material));
            obj.material.color.setRGB(255, 0, 0);
        }
        return intersects
    };

    constr.prototype.getFirstIntersect = function() {
        var vector = new THREE.Vector3(0,0,-1);
        vector.applyQuaternion(this.camera.quaternion);

        // Create a ray caster and apply the direction vector originatinf from the camera's position
        var raycaster = new THREE.Raycaster();
        raycaster.set(this.camera.position, vector);

        // Get the intersecting objects from our raycaster
        var intersects = raycaster.intersectObjects(this.sceneItems);
        for (var j = 0; j < this.sceneItems.length; j++) {
            var ob = this.sceneItems[j];
            ob.material.color.setRGB(255, 255, 255);
        }
        //console.log(intersects);
        if (intersects.length > 0) {
            var obj = intersects[0].object;
            obj.material.color.setRGB(255, 0, 0);
            return obj;
        }
        return null;
    };

    constr.prototype.generateUUID = function(){
        /*
        This is not guaranteed to be unique as it is not communicating cross client
        but should be sufficient for now.
         */
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    };

    constr.prototype.render = function() {
        /*
         Apply rotation to cube mesh
         */
        //cube.rotation.y += 0.01;

        /*
         Update VR headset position and apply to camera.
         */
        try {
            this.controls.update();
        } catch(err) {
            //console.log("Error updating controls");
        }

        // If we are looking at an object let the user know
        this.getFirstIntersect();

        this.move();


        // Make object look at you
        if (this.selectedObject) {
            this.updateSelectedObject();
            this.updateHUD();
        }

        /*
         Render the scene through the VREffect.
         */
        //this.sceneItems[0].rotation.y += 0.1;
        if (this.isVRMode()) {
            this.effect.render(this.scene, this.camera);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        //if (this.isVRMode()) {
        //
        //} else {
        //    this.renderer.render(this.scene, this.camera);
        //}
    };

    constr.prototype.rotateObject = function(obj, axis, inc) {
        switch(axis) {
            case "X":
                obj.rotation.x += inc * Math.PI/360;
                break;
            case "Y":
                obj.rotation.y += inc * Math.PI/360;
                break;
            case "Z":
                obj.rotation.z += inc * Math.PI/360;
                break;
        }
        this.socket.emit('object moved', that.serializeItem(obj));

    };

    constr.prototype.getOrthogonal = function(vec) {
        // U*V = 0
        // THIS IS INCORRECT!!!!!!! NEEDS FIX
        var x = vec.x * vec.x;
        var y = 0;
        var c = Math.sqrt(0-x);
        // xx' + zz' = 0
        var zp = (0 - vec.x)/vec.z;
        var scalar = zp * zp + 1;
        //var c = ((0 - x - y)/vec.z)
        var res = new THREE.Vector3(1/scalar, 0, zp/scalar);
        console.log("Vec: " + vec.x + ", " + vec.y + ", " + vec.z);
        console.log("Orth: " + res.x + ", " + res.y + ", " + res.z);
        console.log("Scalar: " + res.x*res.x+res.z*res.z + ", z': " + zp);
        return res;
    };

    constr.prototype.movePlayer = function(obj, axis, inc) {
        var dirVec = this.getCameraDirectionVector();
        var tVect = this.getOrthogonal(dirVec);
        switch(axis) {
            case "X":
                //obj.position.x += inc * .5 * tVect.x;
                //obj.position.z += inc * .5 * tVect.z;
                break;
            case "Y":

                break;
            case "Z":
                //obj.position.z += inc * .5;
                obj.position.x += inc * .5 * dirVec.x;
                obj.position.y += inc * .5 * dirVec.y;
                obj.position.z += inc * .5 * dirVec.z;
                break;
        }
        this.userObject.position.set(obj.position);
        this.socket.emit('user moved', {
            type: "positional",
            position: {x: obj.position.x, y: obj.position.y, z: obj.position.z},
            userId: this.userId
        });
    };

    //constr.prototype.movePlayer = function (obj, axis, inc) {
    //    var dirVec = this.getCameraDirectionVector();
    //    // We update our Object3D's position from our "direction"
    //    switch(axis) {
    //        case "X":
    //            obj.position.x += inc * dirVec.x *  Math.sqrt(8);
    //            break;
    //        case "Z":
    //            obj.position.z += inc * dirVec.z *  Math.sqrt(8);
    //            break;
    //    }
    //    this.userObject.position.set(obj.position);
    //    this.socket.emit('user moved', {
    //        type: "positional",
    //        position: {x: obj.position.x, y: obj.position.y, z: obj.position.z},
    //        userId: this.userId
    //    });
    //};

    constr.prototype.getCameraDirectionVector = function() {
        // Create the direction vector for our HMD
        var vector = new THREE.Vector3(0,0,-1);
        vector.applyQuaternion(this.camera.quaternion);
        return vector;
    };

    constr.prototype.distanceFromObject = function(obj) {
        var sum_of_squares = Math.pow(obj.position.x - this.camera.position.x, 2) + Math.pow(obj.position.y - this.camera.position.y, 2) + Math.pow(obj.position.z - this.camera.position.z, 2);
        var distance = Math.sqrt(sum_of_squares);
        return distance;
    };

    constr.prototype.updateSelectedObject = function() {
        var dir = this.getCameraDirectionVector();
        var distance = this.selectedObjectData.distance;
        var np = {
            x: distance * dir.x + this.camera.position.x,
            y: distance * dir.y + this.camera.position.y,
            z: distance * dir.z + this.camera.position.z
        };
        this.selectedObject.position.set(np.x, np.y, np.z);
        //this.selectedObject.lookAt(this.camera.position);
    };

    constr.prototype.enterCreateMode = function() {
        var vector = this.getCameraDirectionVector();
        this.selectedObjectData.distance = 15;
        // Create the object 15 units in front of your face
        var position = {
            x: vector.x * this.selectedObjectData.distance + this.camera.position.x,
            y: vector.y * this.selectedObjectData.distance + this.camera.position.y,
            z: vector.z * this.selectedObjectData.distance + this.camera.position.z
        };
        var obj = {
            type: 'box',
            position: position,
            params: {width: 1, height: 1, depth: 1},
            rotation: {x: 0, y: 0, z: 0},//{x: this.camera.rotation.x, y: this.camera.rotation.y, z: this.camera.rotation.z},
            color: 0xff5252,
            scale: {x: 10, y: 10, z: 10}
        };
        var created = this.createSceneItem(obj);
        this.selectObject(created);
    };

    constr.prototype.goFullScreen = function() {
        this.effect.setFullScreen(true);
    };

    constr.prototype.getItem = function(uuid) {
        return this.sceneItems[uuid];
    };

    constr.prototype.selectObject = function(obj) {
        $('.selected_obj_hud').css('visibility', 'visible');
        this.selectedObject = obj;
        var that = this;
        this.selectedUpdateInterval = setInterval(function() {
            that.socket.emit('object moved', that.serializeItem(that.selectedObject))
        }, 200);
        // Set intiial object distance
        var distance = this.distanceFromObject(this.selectedObject);
        this.selectedObjectData.distance = distance;
    };

    constr.prototype.removeObject = function(obj) {
        this.scene.remove(obj);
        this.socket.emit('object removed', this.serializeItem(obj));
    };

    constr.prototype.foreignerRemovedObject = function(state) {
        var obj = null;
        for (var i = 0; i < this.sceneItems.length; i++) {
            var temp = this.sceneItems[i];
            if (temp.name === state.name) {
                obj = temp;
                this.sceneItems.splice(i, 1);
                break;
            }
        }
        this.scene.remove(obj);
    };

    constr.prototype.changeShape = function(obj, type, inc) {
        switch (type) {
            case "width":
                obj.scale.x += inc;
                break;
            case "height":
                obj.scale.y += inc;
                break;
            case "depth":
                obj.scale.z += inc;
                break;
        }
    };

    constr.prototype.pushObject = function(obj, dir) {
        this.selectedObjectData.distance += dir;
        var vec = this.getCameraDirectionVector();
        // Place object further away from us
        var distVec = {
                x: this.camera.position.x + vec.x * this.selectedObjectData.distance,
                y: this.camera.position.y + vec.y * this.selectedObjectData.distance,
                z: this.camera.position.z + vec.z * this.selectedObjectData.distance
        };
        obj.position.x = distVec.x;
        obj.position.y = distVec.y;
        obj.position.z = distVec.z;
    };

    constr.prototype.move = function() {
        var time = performance.now();
        var delta = ( time - this.prevTime ) / 1000;

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        if ( this.moveForward ) this.velocity.z -= 400.0 * delta;
        if ( this.moveBackward ) this.velocity.z += 400.0 * delta;

        if ( this.moveLeft ) this.velocity.x -= 400.0 * delta;
        if ( this.moveRight ) this.velocity.x += 400.0 * delta;

        //if ( isOnObject === true ) {
        //    this.velocity.y = Math.max( 0, this.velocity.y );
        //
        //    //canJump = true;
        //}

        this.camera.translateX( this.velocity.x * delta );
        this.camera.translateY( this.velocity.y * delta );
        this.camera.translateZ( this.velocity.z * delta );

        this.userObject.position.set(this.camera.position);
        if (this.velocity.x > 0 || this.velocity.y > 0 || this.velocity.z > 0) {
            this.socket.emit('user moved', {
                type: "positional",
                position: {x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z},
                userId: this.userId
            });
        }

        if ( this.camera.position.y < 10 ) {

            this.velocity.y = 0;
            this.camera.position.y = 10;

            //canJump = true;

        }

        this.prevTime = time;
    };

    constr.prototype.onKey = function(event, uuid) {
        switch (event.keyCode) {
            case 8:
                event.preventDefault();
                console.log('Backspace clicked');
                var intersect = this.getFirstIntersect();
                if (intersect != null) {
                    this.removeObject(intersect);
                }
                break;
            case 9:
                event.preventDefault();
                console.log("Clicked Tab");
                //this.switchAttribute();
                break;
            case 13:
                event.preventDefault();
                console.log("Enter clicked");
                // Enter Creation Mode. For now just make a box
                this.enterCreateMode();
                break;
            // Space bar
            case 32:
                event.preventDefault();
                console.log("Spacebar clicked");
                // Select the closest object
                if (this.selectedObject != null) {
                    this.selectedObject = null;
                    $('.selected_obj_hud').css('visibility', 'hidden');
                    clearInterval(this.selectedUpdateInterval);
                    return;
                }
                var intersect = this.getFirstIntersect();
                if (intersect != null) {
                    this.selectObject(intersect);
                }
                break;
            case 38: // up
                this.moveForward = true;
                break;

            case 37: // left
                this.moveLeft = true;
                break;

            case 40: // down
                this.moveBackward = true;
                break;
            case 39: // right
                this.moveRight = true;
                break;
            //case 37:
            //    // Left Arrow
            //    event.preventDefault();
            //    console.log("Left Arrow");
            //    this.movePlayer(this.camera, "X", 1);
            //    break;
            //case 38:
            //    // Up Arrow
            //    event.preventDefault();
            //    console.log("Up Arrow");
            //    this.movePlayer(this.camera, "Z", 1);
            //    break;
            //case 39:
            //    // Right Arrow
            //    event.preventDefault();
            //    console.log("Right Arrow");
            //    this.movePlayer(this.camera, "X", -1);
            //    break;
            //case 40:
            //    // Down arrow
            //    event.preventDefault();
            //    console.log("Down Arrow");
            //    this.movePlayer(this.camera, "Z", -1);
            //    break;
            case 77:
                event.preventDefault();
                console.log("Move Mode");
                break;
            case 74:
                // J clicked
                event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "width", -1);
                }
                break;
            case 76:
                // L clicked
                event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "width", 1);
                }
                break;
            case 73:
                // I clicked
                //event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "height", 1);
                }
                break;
            case 75:
                // K clicked
                event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "height", -1);
                }
                break;
            case 79:
                // O clicked
                event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "depth", 1);
                }
                break;
            case 85:
                // u clicked
                event.preventDefault();
                if (this.selectedObject) {
                    this.changeShape(this.selectedObject, "depth", -1);
                }
                break;
            case 65:
                event.preventDefault();
                console.log("a clicked");
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "X", -1)
                }
                break;
            case 68:
                event.preventDefault();
                console.log("d clicked");
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "X", 1)
                }
                break;
            case 81:
                console.log("q clicked");
                event.preventDefault();
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "Z", -1);
                }
                break;
            case 69:
                console.log("e clicked");
                event.preventDefault();
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "Z", 1);
                }
                break;
            case 87:
                //event.preventDefault();
                console.log("w Clicked");
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "Y", 1);
                }
                break;
            case 83:
                event.preventDefault();
                console.log("s clicked ");
                if (this.selectedObject) {
                    this.rotateObject(this.selectedObject, "Y", -1);
                }
                break;
            case 80:
                // p clicked
                if (this.selectedObject) {
                    this.pushObject(this.selectedObject, 1);
                }
                break;
            case 186:
                // ; clicked
                if (this.selectedObject) {
                    this.pushObject(this.selectedObject, -1)
                }
                break;
            case 90:
                event.preventDefault();
                controls.zeroSensor();
                break;
        }
    };

    constr.prototype.onResizeWindow = function(w, h) {
        this.width = w;
        this.height = h;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.effect.setSize( w, h );
    };

    constr.prototype.onMouseMove = function ( event ) {

        //if ( scope.enabled === false ) return;

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        console.log("Movement X: " + movementX + ", Movement Y: " + movementY);
        this.camera.rotation.y += movementX * 0.002;
        //this.camera.rotation.x += movementY * 0.002;

        //this.camera.rotation.y -= movementX * 0.002;
        //this.camera.rotation.x -= movementY * 0.002;
        //
        //this.camera.rotation.x = Math.max( - PI_2, Math.min( PI_2, this.camera.rotation.x ) );

    };

    constr.prototype.onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: // up
                this.moveForward = false;
                break;

            case 37: // left
                this.moveLeft = false;
                break;

            case 40: // down
                this.moveBackward = false;
                break;

            case 39: // right
                this.moveRight = false;
                break;

        }

    };

    //constr.prototype.getIntersects = function(event) {
    //    event.preventDefault();
    //
    //    var vector = new THREE.Vector3();
    //    vector.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
    //    vector.unproject( this.camera );
    //
    //    raycaster.ray.set( this.camera.position, vector.sub( this.camera.position ).normalize() );
    //
    //    var particleMaterial = new THREE.SpriteCanvasMaterial( {
    //
    //        color: 0x000000,
    //        program: function ( context ) {
    //
    //            context.beginPath();
    //            context.arc( 0, 0, 0.5, 0, PI2, true );
    //            context.fill();
    //
    //        }
    //
    //    } );
    //
    //    var intersects = this.raycaster.intersectObjects( this.sceneItems );
    //
    //    if ( intersects.length > 0 ) {
    //
    //        intersects[ 0 ].object.material.color.setHex( Math.random() * 0xffffff );
    //
    //        var particle = new THREE.Sprite( particleMaterial );
    //        particle.position.copy( intersects[ 0 ].point );
    //        particle.scale.x = particle.scale.y = 16;
    //        this.scene.add( particle );
    //
    //    }
    //};

    return constr;
}());

var capstone = new CAPSTONE(window.innerWidth, window.innerHeight);
var orth = capstone.getOrthogonal({x: 5, y: 5, z: 5});

document.addEventListener( 'keydown', capstone.onKey.bind(capstone), false );
document.addEventListener( 'keyup', capstone.onKeyUp.bind(capstone), false );
document.addEventListener( 'mousemove', capstone.onMouseMove.bind(capstone), false );
/*
Request animation frame loop function
*/
function animate() {
    capstone.render();
    requestAnimationFrame( animate );
}
/*
Kick off animation loop
*/
animate();

/*
Listen for double click event to enter full-screen VR mode
*/
document.body.addEventListener( 'dblclick', function() {
    //effect.setFullScreen( true );
    capstone.goFullScreen();
});

//window.addEventListener("keydown", capstone.onKey.bind(capstone), true);


//document.addEventListener( 'mousedown', capstone.getIntersects.bind(capstone), false );
/*
Handle window resizes
*/
function onWindowResize() {
    capstone.onResizeWindow(window.innerWidth, window.innerHeight);
}

window.addEventListener( 'resize', onWindowResize, false );