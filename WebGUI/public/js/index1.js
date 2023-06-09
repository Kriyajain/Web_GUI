window.onbeforeunload = function () {
  return "Are you sure?";
};

var ros;
var twist;
var cmdVel;
var cmdVelAuto;
var angleDegrees;
var magnitude;
var lat = [];
var long = [];
var yaw = [];

$("#webSocketStart").click(function () {
  var url = "http://localhost:3000/webSocketStart";
  $.post(url, function (data, status) {
    console.log(`Data : ${data} and Status : ${status}`);
    $("#webSocketStart").attr("disabled", true);
    $("#webSocketEnd").attr("disabled", false);
    setTimeout(rosConnect(), 2000);
  });
});

$("#webSocketEnd").click(function () {
  $("#socketStatus").text("Disconnecting...");
  $("#webSocketEnd").attr("disabled", true);
  $("#webSocketEnd").attr("value", "Disconnecting");
  var url = "http://localhost:3000/webSocketEnd";
  $.post(url, function (data, status) {
    console.log(`Data : ${data} and Status : ${status}`);
    $("#webSocketStart").attr("disabled", false);
    $("#webSocketEnd").attr("value", "End");
  });
});

function rosConnect() {
  ros = new ROSLIB.Ros({
    url: "ws://localhost:9090",
  });

  ros.on("connection", function () {
    $("#socketStatus").text("Connected");
    initVelocityPublisher();
    initVelocitySubscriber();
    console.log("Connected to websocket server.");
  });

  ros.on("error", function (error) {
    $("#socketStatus").text("Connecting...");
    console.log("Error connecting to websocket server");
  });

  ros.on("close", function () {
    if (!$("#webSocketEnd").attr("disabled")) {
      setTimeout(rosConnect(), 1000);
    } else {
      $("#socketStatus").text("Closed");
      $("#start").attr("disabled", false);
      console.log("Connection to websocket server closed.");
    }
  });
}

var imuSub;
$("#switchImu").change(function () {
  let check = $("#switchImu").prop("checked");
  if (check) {
    imuSub = new ROSLIB.Topic({
      ros: ros,
      name: "/hmc",
      messageType: "sensor_msgs/twist",
    });

    imuSub.subscribe(function (msg) {
      // yaw = q
      yaw = msg.linear.x;

      // let angle = Math.atan2(
      //   2.0 * (q.w * q.z + q.x * q.y),
      //   1 - 2.0 * (q.y * q.y + q.z * q.z)
      // );
      // angle = (angle * 180) / Math.PI + 90;
      // if (angle < 0) {
      //   angle += 360;
      // }
      // angle = Math.round(angle * 100) / 100;
      // $("#imuData").text(angle);
    });
  } else {
    imuSub.unsubscribe();
    $("#imuData").text(0.0);
  }
});

var gpsSub;
$("#switchGPS").change(function () {
  let check = $("#switchGPS").prop("checked");
  if (check) {
    gpsSub = new ROSLIB.Topic({
      ros: ros,
      name: "/gps_fix",
      messageType: "sensor_msgs/NavSatFix",
    });

    gpsSub.subscribe(function (msg) {
      lat = msg.latitude;
      lon = msg.longitude;
      $("#gpsLat").text(msg.latitude);
      $("#gpsLong").text(msg.longitude);
    });
  } else {
    gpsSub.unsubscribe();
    $("#gpsLat").text(0);
    $("#gpsLong").text(0);
  }
});

var autoStatusSub;
$("#switchAuto").change(function () {
  let check = $("#switchAuto").prop("checked");
  if (check) {
    autoStatusSub = new ROSLIB.Topic({
      ros: ros,
      name: "/gui_msg_topic",
      messageType: "custom_msg/gui_msg",
    });

    autoStatusSub.subscribe(function (msg) {
      console.log(msg);
      $("#goalDistance").text(msg.distance);
      $("#liveGoal").text(msg.goal_no);
      $("#gpsX").text(msg.location_x);
      $("#gpsY").text(msg.location_y);
      if (msg.flag_ob_avoid_or_g2g == 1) {
        $("#g2gTask").addClass("auto-status-btn-active");
        $("#obaTask").removeClass("auto-status-btn-active");
      } else {
        $("#obaTask").addClass("auto-status-btn-active");
        $("#g2gTask").removeClass("auto-status-btn-active");
      }
    });
  } else {
    autoStatusSub.unsubscribe();
    $("#goalDistance").text(0);
    $("#liveGoal").text(0);
    $("#gpsX").text(0);
    $("#gpsY").text(0);
    $("#g2gTask").removeClass("auto-status-btn-active");
    $("#obaTask").removeClass("auto-status-btn-active");
  }
});

$("#switchTask").change(function () {
  let check = $("#switchTask").prop("checked");
  if (check) {
    $(".controller").attr("disabled", true);
    navigator.keyboard.lock();
  } else {
    $(".controller").attr("disabled", false);
    navigator.keyboard.unlock();
  }
});

function initVelocityPublisher() {
  twist = new ROSLIB.Message({
    linear: {
      x: 0.0,
      y: 0.0,
      z: 0.0,
    },
    angular: {
      x: 0.0,
      y: 0.0,
      z: 0.0,
    },
  });

  cmdVel = new ROSLIB.Topic({
    ros: ros,
    name: "/cmd_vel",
    messageType: "geometry_msgs/Twist",
    latch: true,
  });
  // cmdVel.advertise();
}

function cartesian2Polar(x, y) {
  distance = Math.sqrt(x * x + y * y);
  radians = Math.atan2(y, x);
  if (radians < 0) {
    radians = radian + 2 * Math.PI;
  }
  polarCoor = { distance: distance, radians: radians };
  return polarCoor;
}

function initVelocitySubscriber() {
  cmdVelAuto = new ROSLIB.Topic({
    ros: ros,
    name: "/cmd_vel_auto",
    messageType: "geometry_msgs/Twist",
    latch: true,
  });

  cmdVelAuto.subscribe(function (msg) {
    console.log("hi");
    twist.linear.x = Math.round(msg.linear.x * 10000) / 10000;
    twist.linear.y = Math.round(msg.linear.y * 10000) / 10000;
    angleDegrees = twist.linear.x;
    magnitude = twist.linear.y;

    // if ($("#switchTask").prop("checked")) {
    //   twist.linear.x = Math.round(msg.linear.x * 10000) / 10000;
    //   twist.angular.z = Math.round(msg.angular.z * 10000) / 10000;
    if ($("#switchSpeed").prop("checked")) {
      twist.linear.x = Math.round(msg.linear.x * 10000) / 10000;
      twist.linear.y = Math.round(msg.linear.y * 10000) / 10000;
      twist.angular.z = Math.round(msg.angular.z * 10000) / 10000;

      x1 = 10 * (twist.linear.x * 0.866 - twist.angular.z * 0.866);
      y1 = twist.linear.y + twist.linear.x * 0.5 + twist.angular.z * 0.5;

      twist.angular.x = cartesian2Polar(x1, y1).distance;
      twist.angular.y = cartesian2Polar(x1, y1).radians;
      const angleDegrees = (twist.angular.y * 180) / Math.PI;
      const magnitude = twist.angular.x;
      io.emit("vectorUpdate", { angleDegrees, magnitude });

      if (Math.abs(twist.angular.z) == 0) {
        $("#cmdVelV").text(
          twist.linear.x + " " + "+" + Math.abs(twist.angular.z) + "j"
        );
      } else {
        if (twist.angular.z / Math.abs(twist.angular.z) == 1) {
          $("#cmdVelV").text(
            twist.linear.x + " " + "+" + Math.abs(twist.angular.z) + "j"
          );
        } else {
          $("#cmdVelV").text(
            twist.linear.x + " " + "-" + Math.abs(twist.angular.z) + "j"
          );
        }
      }
    }
    cmdVel.publish(twist);
  });
}

$("#switchSpeed").change(function () {
  let check = $("#switchSpeed").prop("checked");
  if (!check) {
    $("#cmdVelX").text(0);
    $("#cmdVelZ").text(0);
  }
});

function speedPub(key) {
  if (key == "up" || key == "w" || key == "W") {
    animate("#up");
    twist.linear.x += 0.1;
  } else if (key == "down" || key == "s" || key == "S") {
    animate("#down");
    twist.linear.x += -0.1;
  } else if (key == "left" || key == "a" || key == "A") {
    animate("#left");
    twist.angular.z += 0.1;
  } else if (key == "right" || key == "d" || key == "D") {
    animate("#right");
    twist.angular.z += -0.1;
  } else if (key == "stop" || key == " ") {
    animate("#stop");
    twist.linear.x = 0.0;
    twist.angular.z = 0.0;
  }
  twist.linear.x = Math.round(twist.linear.x * 10000) / 10000;
  twist.angular.z = Math.round(twist.angular.z * 10000) / 10000;
  if ($("#switchSpeed").prop("checked")) {
    $("#cmdVelX").text(twist.linear.x);
    $("#cmdVelZ").text(twist.angular.z);
  }
  cmdVel.publish(twist);
}

$(document).on("keypress", function (event) {
  if ($("#switchTask").prop("checked") == false) {
    speedPub(event.key);
  }
});

$(".controller").click(function (event) {
  speedPub(this.id);
});

function animate(currentBtn) {
  $(currentBtn).addClass("pressed");
  setTimeout(function () {
    $(currentBtn).removeClass("pressed");
  }, 100);
}

$("#goalNumber").on("input", function () {
  let num = $("#goalNumber").val();
  if (num) {
    $("#goalBtn").attr("disabled", false);
  } else {
    $("#goalBtn").attr("disabled", true);
  }
});

$(".cordinates").on("input", function () {
  let _lat = $("#lat").val();
  let _long = $("#long").val();

  if (_lat && _long) {
    $("#enter").attr("disabled", false);
  } else {
    $("#enter").attr("disabled", true);
  }
});

$("#enter").click(function () {
  let currGoal = $("#currGoal").text();
  let totalGoal = $("#goalNumber").val();
  if (currGoal < totalGoal) {
    lat.push(parseFloat($("#lat").val()));
    long.push(parseFloat($("#long").val()));
    $("#lat").val("");
    $("#long").val("");
    $("#currGoal").text(parseInt(currGoal) + 1);
  } else {
    lat.push(parseFloat($("#lat").val()));
    long.push(parseFloat($("#long").val()));
    $("#lat").attr("disabled", true);
    $("#long").attr("disabled", true);
    $("#enter").attr("disabled", true);

    initLatPublisher(lat);
    initLongPublisher(long);
    $("#autonomousStart").attr("disabled", false);
  }
});

function initLatPublisher(lat) {
  var latCord = new ROSLIB.Message({
    data: [],
  });

  var latPub = new ROSLIB.Topic({
    ros: ros,
    name: "/goal_latitude",
    messageType: "std_msgs/Float64MultiArray",
    latch: true,
  });
  latCord.data = lat;
  latPub.publish(latCord);
}

function initLongPublisher(long) {
  var longCord = new ROSLIB.Message({
    data: [],
  });

  var longPub = new ROSLIB.Topic({
    ros: ros,
    name: "/goal_longitude",
    messageType: "std_msgs/Float64MultiArray",
    latch: true,
  });
  longCord.data = long;
  longPub.publish(longCord);
}

$("#goalBtn").click(function (event) {
  event.preventDefault();
  let num = $("#goalNumber").val();
  $("#goalBtn").attr("disabled", true);
  $("#goalNumber").attr("disabled", true);
  $("#lat").attr("disabled", false);
  $("#long").attr("disabled", false);
  $("#currGoal").text(1);
});

$("#autonomousReset").click(function () {
  lat = [];
  long = [];
  $("#lat").val("");
  $("#long").val("");
  $("#currGoal").text(0);
  $("#goalNumber").attr("disabled", false);
  $("#goalNumber").val("");
});

export { angleDegrees, magnitude };
