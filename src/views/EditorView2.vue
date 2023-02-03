<template>
  <div>
    <div class="canvas-section-wrapper" style="position: relative">
      <div class="html-container shadow">
        <div v-for="(object, index) in canvasObjects" :key="object.id">
          <div
            class="target text"
            :data-obj-index="index"
            :data-obj-type="object.type"
            :style="canvasObjStyle(object)"
            v-if="object.type == 'text'"
            :contentEditable="true"
            @dblclick="doubleClicked"
          >
            Editable Text
          </div>
          <div
            class="target"
            :data-obj-index="index"
            :data-obj-type="object.type"
            :style="canvasObjStyle(object)"
            v-if="object.type == 'image'"
          >
            <img :src="object.source" />
          </div>
          <div
            class="target"
            :data-obj-index="index"
            :data-obj-type="object.type"
            :style="canvasObjStyle(object)"
            v-if="object.type == 'shape'"
            :width="object.width"
            :height="object.height"
          >
            <img src="@/assets/star-icon.svg" />
          </div>
        </div>
      </div>
    </div>
    <div>
      <h2>Items</h2>
      <button @click="addObjectToCanvas('text')">Add Text</button>
      <button @click="addObjectToCanvas('image')">Add Image</button>
      <button @click="addObjectToCanvas('shape')">Add Shape</button>
      <button @click="unselectAll">Unselect All</button>
      <div v-if="displayIndex > -1" style="margin-top: 50px">
        <div>
          <template v-if="canvasObjects[displayIndex].type == 'text'">
            <!-- <input v-model="canvasObjects[displayIndex].text" placeholder="text" /> -->
            <input
              v-model="canvasObjects[displayIndex].color"
              type=""
              placeholder="Color"
            />
            <input
              v-model="canvasObjects[displayIndex].fontSize"
              type="number"
              placeholder="Font size"
            />
          </template>
          <template v-if="canvasObjects[displayIndex].type == 'image'">
            <input
              placeholder="Image source"
              v-model="canvasObjects[displayIndex].source"
            />
          </template>
          <template v-if="canvasObjects[displayIndex].type == 'shape'">
            <input placeholder="width" v-model="canvasObjects[displayIndex].width" />
            <input placeholder="height" v-model="canvasObjects[displayIndex].height" />
          </template>
          <div>
            <button type="button" @click.prevent="deleteCanvasObj(displayIndex)">
              Delete this item
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Moveable from "moveable";
import _ from "lodash";
import Selecto from "selecto";
export default {
  data() {
    return {
      textObjects: [
        {
          text: "placeholder text",
        },
      ],

      canvasObjects: [
        // {
        // type: "",
        // width: 0,
        // height: 0,
        // text: "",
        // fontSize: 0,
        // transform: "",
        // top: 0,
        // left: 0,
        // source: "",
        // },
      ],

      displayIndex: -1,
      displayPropertiesType: "",

      isShowRulerCoordinates: false,
      snapLines: [],
      snapDirection: "",
      snapLineTop: 0,
      snapLineLeft: 0,
      throttleFunctionReference: null,
      container: null,
      nMoveable: { target: null },
      handlerTriggeredCount: 0,
      nSelecto: null,
      contentList: [],
      nframeMap: new Map(),
      zoom: 1,
      mouseDown: 0,
      targets: [],
      oldSelectedObjectId: null,
      isMounted: false,
      rulerOffsetTop: 0,
      rulerOffsetLeft: 0,
      coordinatePositionY: 0,
      coordinatePositionX: 0,
    };
  },
  mounted() {
    this.container = document.querySelector(".html-container");
    this.bindClickEventToMoveableControls();
    this.addMoveable();
    this.addSelecto();
    this.bindClickEventToMoveableControls();

    this.throttleFunctionReference = _.throttle((e) => this.keydownHandler(e), 100);
    window.addEventListener("keydown", this.throttleFunctionReference);
    // document.addEventListener("keydown", this.moveWithArrows);
    console.log("Mounted");
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.moveWithArrows);
  },
  watch: {},
  methods: {
    addMoveable() {
      this.nMoveable = new Moveable(this.container, {
        draggable: true,
        target: null,
        dragTarget: null,
        container: this.container,
        dragArea: true,
        resizable: true,
        scalable: true,
        rotatable: true,
        origin: false,
        throttleRotate: 0,
        rotationPosition: "top",
        throttleResize: 1,
        renderDirections: ["n", "ne", "s", "nw", "e", "se", "w", "sw"],
        zoom: 1,
        padding: { left: 0, top: 0, right: 0, bottom: 0 },
        keepRatio: false,
        edge: false,
        snappable: true,
        // bounds : { left: 0, right: this.getProduct.width, top: 0, bottom: this.getProduct.height},
        snapCenter: true,
        snapVertical: true,
        snapHorizontal: true,
        elementGuidelines: [],
        snapElement: true,
        defaultGroupRotate: 0,
        passDragArea: false,
        snapThreshold: 5,
        verticalGuidelines: this.getVerticalGuidelines,
        horizontalGuidelines: this.getHorizontalGuidelines,
        isDisplaySnapDigit: true,
        snapDistFormat: (v) => `${v}px`,
        defaultGroupOrigin: "50% 50%",
        originDraggable: true,
        originRelative: true,
        triggerAblesSimultaneously: true,
      });
      this.nMoveable
        .on("clickGroup", (e) => {
          this.nSelecto.clickTarget(e.inputEvent, e.inputTarget);
          // console.log("clickgroup");
        })

        .on("rotateStart", this.handleRotateStart)
        .on("rotate", this.handleRotate)
        .on("rotateEnd", this.handleRotateEnd)
        //
        .on("scaleStart", this.handleScaleStart)
        .on("scale", this.handleScale)
        .on("scaleEnd", this.handleScaleEnd)
        //
        .on("resizeStart", this.handleResizeStart)
        .on("resize", this.handleResize)
        .on("resizeEnd", this.handleResizeEnd)
        //
        .on("dragStart", this.handleDragStart)
        .on("drag", this.handleDrag)
        .on("dragEnd", this.handleDragEnd)
        //
        .on("dragGroupStart", this.handleGroupDragStart)
        .on("dragGroup", this.handleGroupDrag)
        .on("dragGroupEnd", this.handleGroupDragEnd)
        //
        .on("resizeGroupStart", this.handleResizeGroupStart)
        .on("resizeGroup", this.handleResizeGroup)
        .on("resizeGroupEnd", this.handleResizeGroupEnd);
    },
    addSelecto() {
      this.nSelecto = new Selecto({
        container: document.body,
        dragContainer: this.container,
        selectableTargets: [".html-container .target"],
        hitRate: 0,
        selectByClick: true,
        selectFromInside: false,
        toggleContinueSelect: ["shift"],
      })
        .on("dragStart", this.onSelectDragStart)
        .on("selectStart", this.onSelectStart)
        .on("select", this.onSelect)
        .on("selectEnd", this.onSelectEnd);
      // .on("dragStart", (e) => {
      //   const target = e.inputEvent.target;
      //   console.log("on selectDragstart", e.inputEvent.detail);
      //   console.log([e.inputEvent.target.dataset]);
      //   if (e.inputEvent.detail == 2) {
      //     console.log("Double Click Event and is text");
      //     console.log([this.nMoveable.target]);

      //     // this.nMoveable.target.contentEditable = true;
      //     this.canvasObjects[
      //       this.nMoveable.target[0].dataset.objIndex
      //     ].contentEditable = true;
      //   }
      //   if (
      //     this.nMoveable.isMoveableElement(target) ||
      //     this.targets.some((t) => t === target || t.contains(target))
      //   ) {
      //     e.stop();
      //   }
      // });
    },
    // bindClickEventToMoveableControls() {
    //   const movebaleDirections = document.getElementsByClassName(
    //     "moveable-control moveable-direction"
    //   );
    //   for (let i = 0; i < movebaleDirections.length; i++) {
    //     movebaleDirections[i].mouseover = this.onMoveableDirectionClick;
    //     movebaleDirections[i].onmousedown = this.onMoveableDirectionClick;
    //   }
    // },
    handleGroupDragStart(e) {
      console.log("handleGroupDragStart");
      ///////////
      e.events.forEach((ev) => {
        this.setFrameFromTarget(ev.target);
        const frame = this.nframeMap.get(ev.target);
        ev.set(frame.translate);
      });
      //////////
      console.log("handleGroupDragStart FUNCTION ENDED");
    },
    handleGroupDrag(e) {
      console.log("handleGroupDrag");
      const { nframeMap } = this;
      e.events.forEach((ev) => {
        const target = ev.target;
        const frame = nframeMap.get(target);
        frame.translate = ev.beforeTranslate;
        target.style.transform = this.getTransform(frame, target);
      });
      console.log("handleGroupDrag HAS ended");
      this.nMoveable.updateRect();
    },
    handleGroupDragEnd(e) {
      console.log("handleGroupDragEnd");
      console.log(e);
      document.body.style.cursor = "pointer";
      e.targets.forEach((target) => {
        const frame = this.nframeMap.get(target);
        let object = this.canvasObjects[target.dataset.objIndex];
        object.translateX = frame.translate[0];
        object.translateY = frame.translate[1];
        let angle = parseFloat(frame.rotate);
        object.rotate = angle;
      });
      console.log(this.nframeMap);
      this.nMoveable.updateRect();
    },
    onSelectStart(e) {
      console.log("onSelectStart");
      console.log(e);
      e.added.forEach((el) => {
        el.classList.add("selected");
      });
      e.removed.forEach((el) => {
        el.classList.remove("selected");
      });
    },
    onSelectEnd(e) {
      console.log("onSelectEnd");
      console.log(this.nMoveable.target);
      if (e.selected.length >= 2) {
        this.nMoveable.renderDirections = ["ne", "nw", "se", "sw"];
        // this.nMoveable.resizable = true;
        // this.nMoveable.scalable = true;
      } else {
        this.nMoveable.renderDirections = ["n", "ne", "s", "nw", "e", "se", "w", "sw"];
      }
      if (this.nMoveable.target && this.nMoveable.target.length > 0) {
        this.canvasObjects[
          this.nMoveable.target[0].dataset.objIndex
        ].contentEditable = false;
        this.displayIndex = -1;
      }

      this.targets = e.selected;
      this.nMoveable.target = this.targets;
      let { nMoveable } = this;
      console.log(e);
      if (e.isDragStart && nMoveable) {
        // e.inputEvent.preventDefault();

        setTimeout(() => {
          this.nMoveable.dragStart(e.inputEvent);
        });
      }

      this.bindClickEventToMoveableControls();
      console.log("onSelectEnd function ended");
    },
    onSelect(e) {
      console.log("onSelect");
      e.added.forEach((el) => {
        el.classList.add("selected");
      });
      e.removed.forEach((el) => {
        el.classList.remove("selected");
      });
    },
    onSelectDragStart(e) {
      // console.log("ds", e.inputEvent.target);
      // let { nMoveable, targets } = this;
      // const target = e.inputEvent.target;
      // console.log(nMoveable.isMoveableElement(target));
      // nMoveable.target.push(target);
      // if (
      //   nMoveable.isMoveableElement(target) ||
      //   targets.some((t) => t === target || t.contains(target))
      // ) {
      //   e.stop();
      // }
      ////////////////////////////
      // const target = e.inputEvent.target;
      console.log("on selectDragstart", e.inputEvent.detail);
      // console.log([e.inputEvent.target.dataset]);
      // if (e.inputEvent && e.inputEvent.detail == 2) {
      //   console.log("Double Click Event and is text");
      //   console.log([this.nMoveable.target]);

      //   // this.nMoveable.target.contentEditable = true;
      //   this.canvasObjects[
      //     this.nMoveable.target[0].dataset.objIndex
      //   ].contentEditable = true;
      // }
      // if (
      //   this.nMoveable.isMoveableElement(target) ||
      //   this.targets.some((t) => t === target || t.contains(target))
      // ) {
      //   e.stop();
      // }
      // this.nMoveable.updateRect();
      ////////////////////////////
      let { nMoveable, targets } = this;
      const target = e.inputEvent.target;
      if (
        nMoveable.isMoveableElement(target) ||
        targets.some((t) => t === target || t.contains(target))
      ) {
        // e.stop();
        console.log(e.isDouble);
        if (e.inputEvent && e.isDouble) {
          console.log("Double Click Event and is text");
          console.log([this.nMoveable.target]);
          console.log(this.nMoveable);
          this.nMoveable.target.contentEditable = true;

          // this.nMoveable.target.contentEditable = true;
          // this.canvasObjects[
          //   this.nMoveable.target[0].dataset.objIndex
          // ].contentEditable = true;
          this.nMoveable.target = [];
          e.stop();
        }
      }
      console.log("on selectDragstart function ended");
    },

    handleScaleStart(e) {
      console.log("handle scale started");
      const frame = this.nframeMap.get(e.target);
      this.setFrameFromTarget(e.target);
      e.set(frame.scale);
      e.dragStart && e.dragStart.set(frame.translate);

      e.set(frame.scale);
      e.dragStart && e.dragStart.set(frame.translate);
      this.nMoveable.updateRect();
    },
    handleScale(e) {
      console.log("handleScale");
      const beforeTranslate = e.drag.beforeTranslate;
      const frame = this.nframeMap.get(e.target);
      console.log(frame);
      frame.translate = e.drag.beforeTranslate;
      frame.scale = e.scale;
      e.target.style.transform =
        `translate(${beforeTranslate[0]}px, ${beforeTranslate[1]}px) rotate(${frame.rotate}deg)` +
        ` scale(${e.scale[0]}, ${e.scale[1]})`;
      this.nMoveable.updateRect();
    },
    handleScaleEnd(e) {
      console.log("handleScaleEnd");
      console.log(e.target.dataset.objIndex);
      console.log(e.target.style.transform);

      const frame = this.nframeMap.get(e.target);
      let object = this.canvasObjects[e.target.dataset.objIndex];
      object.translateX = frame.translate[0];
      object.translateY = frame.translate[1];
      let scaleReg = /\.*scale\((.*)\)/i;
      let tempElement = e.target;
      let tempScale = scaleReg.exec(tempElement.style.transform)[1];
      tempScale = tempScale.split(",");
      let translateReg = /\.*translate\((.*)px\)/i;
      let tempTranslate = translateReg.exec(tempElement.style.transform)[1];
      tempTranslate = tempTranslate.split(",");
      object.scaleX = tempScale[0];
      object.scaleY = tempScale[0];
      // object.fontSize = object.fontSize * object.scaleX;
      object.transform =
        `translate(${tempTranslate})` +
        `rotate(${frame.rotate}deg)` +
        ` scale(${tempScale[0]}, ${tempScale[0]})`;
      let angle = parseFloat(frame.rotate);
      object.rotate = angle;
      // this.updateVariationGroup(object);
      this.nMoveable.scalable = true;
      this.nMoveable.keepRatio = false;
      this.nMoveable.snappable = true;
      this.nMoveable.resizable = false;
      this.nMoveable.updateRect();
      console.log(e.target.style.width, e.target.style.height);
    },
    handleDragStart(e) {
      console.log("handleDragStart");
      console.log(e);
      document.body.style.cursor = "move";
      e.target.style.cursor = "move";
      let { nframeMap } = this;
      this.setFrameFromTarget(e.target);
      const frame = nframeMap.get(e.target);
      e.set(frame.translate);
    },
    handleDrag(e) {
      console.log("handleDrag");
      const { target } = e;
      document.body.style.cursor = "move";
      e.target.style.cursor = "move";
      const { nframeMap } = this;
      const frame = nframeMap.get(target);
      frame.translate = e.beforeTranslate;
      target.style.transform = this.getTransform(frame, target);
    },
    handleDragEnd(e) {
      console.log("handleDragEnd");
      document.body.style.cursor = "pointer";
      e.target.style.cursor = "pointer";
      const frame = this.nframeMap.get(e.target);
      let object = this.canvasObjects[e.target.dataset.objIndex];
      console.log(e.target.dataset.objIndex);
      console.log(object);
      object.translateX = frame.translate[0];
      object.translateY = frame.translate[1];
      let angle = parseFloat(frame.rotate);
      object.rotate = angle;
    },
    handleRotateStart(e) {
      this.setFrameFromTarget(e.target);
      const frame = this.nframeMap.get(e.target);
      e.set(frame.rotate);
    },
    handleRotate(e) {
      const frame = this.nframeMap.get(e.target);
      frame.rotate = e.beforeRotate;
      e.target.style.transform = this.getTransform(frame, e.target);
    },
    handleRotateEnd(e) {
      const frame = this.nframeMap.get(e.target);
      let object = this.canvasObjects[e.target.dataset.objIndex];
      let angle = parseFloat(frame.rotate);
      object.translateX = frame.translate[0];
      object.translateY = frame.translate[1];
      object.rotate = angle;
    },

    handleResizeStart(e) {
      console.log("Resize start");
      // if (!this.isGridActive) {
      //   this.nMoveable.snappable = false;
      // }
      // this.nMoveable.keepRatio = e.target.dataset.keepratio;
      this.setFrameFromTarget(e.target);
      e.setOrigin(["%", "%"]);
      const frame = this.nframeMap.get(e.target);
      e.dragStart && e.dragStart.set(frame.translate);
      console.log(frame);
    },
    // handleResize({ target, width, height, dist, delta, clientX, clientY, transform }) {
    handleResize(e) {
      console.log("handleResize");
      console.log(e);
      // target.style.width = `${width}px`;
      // target.style.height = `${height}px`;
      // target.style.transform = transform;
      // this.nMoveable.updateRect();
      const frame = this.nframeMap.get(e.target);
      const beforeTranslate = e.drag.beforeTranslate;
      frame.translate = beforeTranslate;
      let widthChanaged = e.width != parseFloat(e.target.style.width);
      let heightChanged = e.height != parseFloat(e.target.style.height);
      console.log(e.direction);
      if (e.target.dataset.objType == "text") {
        if (widthChanaged && heightChanged) {
          e.delta[0] && (e.target.style.width = `${e.width}px`);
          e.target.style.height = "auto"; //Added this line to avoid manual height of TEXT
        } else if (widthChanaged && e.target.dataset.objType == "text") {
          e.target.style.height = "auto";
          e.delta[0] && (e.target.style.width = `${e.width}px`);
        } else if (heightChanged && e.target.dataset.objType == "text") {
          // e.delta[1] && (e.target.style.height = `${e.height}px`);
          e.target.style.height = "auto"; //Added this line to avoid manual height of TEXT
        }
      } else if (e.target.dataset.objType == "image") {
        let scaleReg = /\.*scale\((.*)\)/i;
        let translateReg = /\.*translate\((.*)px\)/i;
        let tempElement = e.target;
        let tempScale = scaleReg.exec(tempElement.style.transform)[1];
        tempScale = `scale(${tempScale})`;
        let tempTranslate = translateReg.exec(tempElement.style.transform)[1];
        tempTranslate = tempTranslate.split(",");
        let oldWidth =
          parseInt(e.target.style.width) > 0 ? parseInt(e.target.style.width) : 1;
        let oldHeight =
          parseInt(e.target.style.height) > 0 ? parseInt(e.target.style.height) : 1;
        let newWidth = e.width > 0 ? e.width : 1;
        let newHeight = e.height > 0 ? e.height : 1;
        let tempTranslateX = isNaN(parseFloat(tempTranslate[0]))
          ? 1
          : parseFloat(tempTranslate[0]);
        let tempTranslateY = isNaN(parseFloat(tempTranslate[1]))
          ? 1
          : parseFloat(tempTranslate[1]);
        tempTranslate[0] = tempTranslateX * (newWidth / oldWidth) + "px";
        tempTranslate[1] = tempTranslateY * (newHeight / oldHeight) + "px";
        let finalTransform = `translate(${tempTranslate}) ${tempScale}`;
        tempElement.style.transform = `${finalTransform}`;
        e.delta[0] && (e.target.style.width = `${e.width}px`);
        e.delta[1] && (e.target.style.height = `${e.height}px`);
      } else if (e.target.dataset.objType == "shape") {
        e.delta[0] && (e.target.style.width = `${e.width}px`);
        e.delta[1] && (e.target.style.height = `${e.height}px`);

        let width = parseInt(e.width);
        let height = parseInt(e.height);
        let w = parseInt(e.target.getAttribute("width"));
        let h = parseInt(e.target.getAttribute("height"));
        let scaleX = width / w;
        scaleX = scaleX ? scaleX : 1;
        let scaleY = height / h;
        scaleY = scaleY ? scaleY : 1;
        e.target.style.transform = `scale(${scaleX},${scaleY})`;
        // if (widthChanaged && heightChanged) {
        //   e.delta[0] && (e.target.style.width = `${e.width}px`);
        //   e.target.style.height = e.width + "px"; //Added this line to avoid manual height of TEXT
        // }
      }
      e.target.style.transform = this.getTransform(frame, e.target);
      this.nMoveable.updateRect();
    },
    handleResizeEnd(e) {
      console.log("handleResizeEnd");
      console.log(e);
      console.log(e.target.style.transform);

      this.nMoveable.snappable = true;
      if (e.lastEvent) {
        const frame = this.nframeMap.get(e.target);
        frame.translate = e.lastEvent.drag.beforeTranslate;
        let object1 = this.canvasObjects[e.target.dataset.objIndex];
        object1.translateX = frame.translate[0];
        object1.translateY = frame.translate[1];
        let angle = parseFloat(frame.rotate);
        object1.angle = angle;
        e.target.style.height = e.lastEvent.height;
        e.target.style.width = e.lastEvent.width;
        object1.transform = e.target.style.transform;
        object1.cropOffsetX *= parseInt(e.target.style.width) / object1.width;
        object1.cropOffsetY *= parseInt(e.target.style.height) / object1.height;
        object1.width = parseInt(e.target.style.width);
        object1.height = parseInt(e.target.style.height);
      }
      this.nMoveable.updateRect();
    },
    // keydownHandler(e) {
    //   //for this method e.preventDefault can't stop.
    //   // if (this.nMoveable) {
    //   //   let distanceToMoveByArrows = e.shiftKey ? 5 : 1;
    //   //   let moveable = this.nMoveable.target;
    //   // }
    //   if (
    //     document.activeElement.contentEditable !== "true" &&
    //     !document.activeElement.outerHTML.startsWith("<input")
    //   ) {
    //     if ((e.key === "C" || e.key === "c") && e.ctrlKey) {
    //       this.copyByKey();
    //       e.stopPropagation();
    //     }
    //     if ((e.key === "V" || e.key === "v") && e.ctrlKey) {
    //       this.pasteByKey();
    //       e.stopPropagation();
    //     }
    //   }
    // },
    setFrameFromTarget(target) {
      console.log("setFrameFromTarget Function");
      let { nframeMap } = this;
      let object = this.canvasObjects[target.dataset.objIndex];
      nframeMap.set(target, {
        translate: [object.translateX, object.translateY, 0],
        rotate: object.rotate,
        scale: [object.scaleX, object.scaleY],
        transformOrigin: "50% 50%",
        clipStyle: "inset",
      });
    },
    // isMoveableBoxLocked(targets) {
    //   let isLocked = false;
    //   for (let i = 0; i < targets.length; i++) {}
    //   return isLocked;
    // },
    onCanvasSection(e) {
      this.nSelecto.clickTarget(e, this.container);
      e.stopPropagation();
      // this.clearTextSelection()
      console.log("from mouse down: ", e);
      e.target.classList.toggle("target");
    },
    getTransform(frame, target) {
      console.log("getTransform func", frame, target);
      // let scaleX =
      //   parseInt(target.dataset ? target.dataset.flipX : 1) * frame.scale
      //     ? frame.scale[0]
      //     : 1;
      let scaleX = frame.scale[0];
      let scaleY = frame.scale[1];
      // console.log(scaleX);
      // scaleX = scaleX ? scaleX : 1;
      let transform =
        `translate(${frame.translate[0]}px, ${frame.translate[1]}px)` +
        ` rotate(${frame.rotate ? frame.rotate : 0}deg)` +
        ` scale(${scaleX}, ${scaleY})`;
      console.log(transform);
      return transform;
    },
    addObjectToCanvas(type) {
      // console.log(type);
      this.nMoveable.target = [];
      this.canvasObjects.push({
        type: type,
        source: "https://loremflickr.com/640/360",
        scaleX: 1,
        scaleY: 1,
        translateX: 100,
        translateY: 150,
        rotate: 0,
        fontSize: 12,
        width: 100,
        height: 100,
        transformOrigin: "50% 50%",
        color: "#000000",
        id: _.uniqueId("item-"),
        contentEditable: false,
      });
      console.log('div[data-obj-index="' + (this.canvasObjects.length - 1) + '"]')
      console.log(
        document.querySelectorAll(
          'div[data-obj-index="' + (this.canvasObjects.length - 1) + '"]'
        )
      );
      this.nMoveable.target = [];
      this.nMoveable.emit("selected");
      console.log(this.nMoveable.emit("selected"))
      console.log(this.canvasObjects.length - 1);
    },
    displayPoperties(index) {
      // console.log(index);
      this.displayIndex = index;
      // this.displayText = this.textObjects[index].text;
      // this.displayTextFS = this.textObjects[index].fontSize
      //   ? this.textObjects[index].fontSize
      //   : 12;
    },
    textFormSubmitted() {
      this.textObjects[this.displayIndex].text = this.displayText;
      this.textObjects[this.displayIndex].fontSize = this.displayTextFS;
      this.displayIndex = -1;
      this.nMoveable.updateRect();
    },
    deleteCanvasObj(itemIndex) {
      console.log(itemIndex);
      this.displayIndex = -1;
      // this.canvasObjects[itemIndex].display = "none";
      this.canvasObjects.splice(itemIndex, 1);
      console.log(this.nMoveable);
      this.nMoveable.target = [];
    },
    canvasObjStyle(object) {
      console.log("canvasObjStyle func: ", object);
      let styleString = `font-size: ${object.fontSize ? object.fontSize : "12"}px;
      transform: translate(${object.translateX}px, ${object.translateY}px) scale(${
        object.scaleX
      },${object.scaleY} ) rotate(${object.rotate}deg);
      height:${object.height}px;
      width:${object.width}px;
      transform-origin:${object.transformOrigin};
      color:${object.color};
      `;
      console.log(styleString);
      return styleString;
    },
    doubleClicked(e) {
      console.log("Double Click");
      console.log(e);
      console.log(this.canvasObjects[e.target.dataset.objIndex]);
      // this.canvasObjects[e.target.dataset.objIndex].contentEditable = true;
    },
    keydownHandler(e) {
      if (this.nMoveable) {
        let distanceToMoveByArrows = e.shiftKey ? 5 : 1;
        let moveable = this.nMoveable.target;

        if (
          moveable != null &&
          ((moveable.length === 1 && moveable[0].contentEditable !== "true") ||
            moveable.length > 1)
        ) {
          if (e.key === "ArrowLeft") {
            this.nMoveable.request("draggable", {
              deltaX: -distanceToMoveByArrows,
              isInstant: true,
            });
            e.preventDefault();
          }
          if (e.key === "ArrowUp") {
            this.nMoveable.request("draggable", {
              deltaY: -distanceToMoveByArrows,
              isInstant: true,
            });
            e.preventDefault();
          }
          if (e.key === "ArrowRight") {
            this.nMoveable.request("draggable", {
              deltaX: distanceToMoveByArrows,
              isInstant: true,
            });
            e.preventDefault();
          }
          if (e.key === "ArrowDown") {
            this.nMoveable.request("draggable", {
              deltaY: distanceToMoveByArrows,
              isInstant: true,
            });
            e.preventDefault();
          }
        }
      }
      // if (
      //   document.activeElement.contentEditable !== "true" &&
      //   !document.activeElement.outerHTML.startsWith("<input")
      // ) {
      //   if ((e.key === "C" || e.key === "c") && e.ctrlKey) {
      //     this.copyByKey();
      //     e.stopPropagation();
      //   }
      //   if ((e.key === "V" || e.key === "v") && e.ctrlKey) {
      //     this.pasteByKey();
      //     e.stopPropagation();
      //   }
      // }
    },
    bindClickEventToMoveableControls() {
      console.log("bindClickEventToMoveableControls function");
      const movebaleDirections = document.getElementsByClassName(
        "moveable-control moveable-direction"
      );
      for (let i = 0; i < movebaleDirections.length; i++) {
        movebaleDirections[i].onmousedown = this.onMoveableDirectionClick;
        movebaleDirections[i].onmouseover = this.onMoveableDirectionClick;
      }
    },
    removeClickEventToMoveableControls() {
      const movebaleDirections = document.getElementsByClassName(
        "moveable-control moveable-direction"
      );
      for (let i = 0; i < movebaleDirections.length; i++) {
        movebaleDirections[i].removeEventListener(
          "mousedown",
          this.onMoveableDirectionClick
        );
      }
    },
    handleResizeGroupStart(e) {
      this.nMoveable.keepRatio = true;
      e.events.forEach((ev) => {
        const target = ev.target;
        this.setFrameFromTarget(target);

        ev.setOrigin(["%", "%"]);
        const frame = this.nframeMap.get(target);
        ev.dragStart && ev.dragStart.set(frame.translate);
      });
    },
    handleResizeGroup(e) {
      e.events.forEach((ev) => {
        const frame = this.nframeMap.get(ev.target);
        const beforeTranslate = ev.drag.beforeTranslate;
        frame.translate = beforeTranslate;
        let widthChanaged = ev.width != parseFloat(ev.target.style.width);
        let heightChanged = ev.height != parseFloat(ev.target.style.height);
        if (ev.target.dataset.type == "text") {
          if (widthChanaged && heightChanged) {
            ev.delta[0] && (ev.target.style.width = `${ev.width}px`);
            ev.delta[1] && (ev.target.style.height = `${ev.height}px`);
          } else if (widthChanaged && ev.target.dataset.type == "text") {
            ev.target.style.height = "auto";
            ev.delta[0] && (ev.target.style.width = `${ev.width}px`);
          } else if (heightChanged && ev.target.dataset.type == "text") {
            ev.delta[1] && (ev.target.style.height = `${ev.height}px`);
          }
        } else {
          ev.delta[0] && (ev.target.style.width = `${ev.width}px`);
          ev.delta[1] && (ev.target.style.height = `${ev.height}px`);
        }
        ev.target.style.transform = this.getTransform(frame, ev.target);
        if (ev.target.dataset.type == "shape") {
          let width = parseInt(ev.width);
          let height = parseInt(ev.height);
          let w = parseInt(ev.target.firstChild.getAttribute("width"));
          let h = parseInt(ev.target.firstChild.getAttribute("height"));
          let scaleX = width / w;
          scaleX = scaleX ? scaleX : 1;
          let scaleY = height / h;
          scaleY = scaleY ? scaleY : 1;
          ev.target.firstChild.style.transform = `scale(${scaleX},${scaleY})`;
        }
        this.nMoveable.updateRect();
      });
    },
    handleResizeGroupEnd(e) {
      let object;
      e.targets.forEach((target) => {
        const frame = this.nframeMap.get(target);
        object = this.canvasObjects[target.dataset.objIndex];
        object.translateX = frame.translate[0];
        object.translateY = frame.translate[1];
        let angle = parseFloat(frame.rotate);
        object.rotate = angle;
        target.style.height = e.lastEvent.height;
        target.style.width = e.lastEvent.width;
        object.transform = target.style.transform;
        object.width = parseInt(target.style.width);
        object.height = parseInt(target.style.height);
      });
    },
    onMoveableDirectionClick(e) {
      console.log("onMoveableDirectionClick");
      console.log(e.target.classList.length);
      if (e.target.classList.length >= 2) {
        const renderDirection = e.target.dataset.direction;
        console.log(renderDirection);
        this.nMoveable.keepRatio = false;
        this.nMoveable.scalable = true;
        this.nMoveable.resizable = true;
        if (
          renderDirection === "se" ||
          renderDirection === "ne" ||
          renderDirection === "sw" ||
          renderDirection === "nw"
        ) {
          this.nMoveable.resizable = false;
          this.nMoveable.keepRatio = true;
          let selectedItem = document.getElementsByClassName("selected");
          console.log(selectedItem);
          if (this.nMoveable.innerMoveable.state.target.length >= 2) {
            this.nMoveable.scalable = true;
            this.nMoveable.resizable = false;
          } else if (selectedItem && selectedItem[0].classList.contains("text")) {
            this.nMoveable.scalable = true;
            this.nMoveable.resizable = false;
          }
        } else if (
          renderDirection === "s" ||
          renderDirection === "e" ||
          renderDirection === "w" ||
          renderDirection === "n"
        ) {
          if (this.nMoveable.innerMoveable.state.target.length >= 2) {
            this.nMoveable.scalable = false;
            this.nMoveable.resizable = false;
          }
          this.nMoveable.scalable = false;
        }
      }
    },
    unselectAll() {
      this.nMoveable.target = [];
    },
  },
};
</script>

<style>
.target {
  position: absolute;
  /* height: 50px;
  width: 150px; */
  /* border: 1px solid yellowgreen; */
}
.target.text {
  z-index: 3000;
  overflow-wrap: break-word;
  text-align: center;
}
.target.text [contenteditable="true"] {
  z-index: 3001;
  outline: 1px solid red;
}
.moveable-control-box {
  z-index: 2;
}
.moveable-control-box .moveable-area {
  z-index: 2;
}

.target img {
  width: 100%;
  height: 100%;
}
.canvas-section-wrapper {
  position: relative;
  border: 4px dotted red;
  min-height: 70vh;
  float: left;
  width: 80%;
  display: block;
  overflow: hidden;
}
.html-container {
  min-height: 90vh;
}
</style>
