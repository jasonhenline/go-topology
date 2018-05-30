(function() {
    "use strict";

    window.onload = function() {
        document.getElementById("create_game_button").addEventListener("click", function() {
            let width = Number(document.getElementById("width_input").value);
            let height = Number(document.getElementById("height_input").value);
            let topology = function() {
                if (document.getElementById("radio_torus").checked) {
                    return "torus";
                } else if (document.getElementById("radio_cylinder").checked) {
                    return "cylinder";
                } else if (document.getElementById("radio_mobius").checked) {
                    return "mobius";
                } else if (document.getElementById("radio_klein").checked) {
                    return "klein";
                }
            }();
            // TODO: Check for simple names that can go into URLs.
            let name = document.getElementById("create_game_name").value

            let xhttp = new XMLHttpRequest();
            xhttp.open("POST", "/go/creategame/" + name)
            xhttp.send(
                JSON.stringify(
                    {
                        width,
                        height,
                        topology
                    }
                 )
             )

             console.log("response text = ", xhttp.responseText)
        })
    };
})();