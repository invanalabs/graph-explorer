class InvanaKnowledgeGraphUI {

    constructor(gremlin_server_url, html_selector_id) {

        this.GREMLIN_SERVER_URL = gremlin_server_url; //"ws://127.0.0.1:8182/gremlin";
        this.html_selector_id = html_selector_id;
        this.canvas_selector_id = "#graph-area";
    }

    init_html() {
        let html_structure = "<div class=\"invana-graph-viewer\">\n" +
            "    <div class=\"page-loading\" style=\"display: none\">\n" +
            "        <div class=\"loader-spin\"></div>\n" +
            "        <p class=\"text-center\">Loading ...</p>\n" +
            "    </div>\n" +
            "    <nav class=\"invana-graph-viewer-nav\">\n" +
            "        <div class=\"invana-graph-viewer-nav-brand\">\n" +
            "            <h3>Graph Studio</h3>\n" +
            "        </div>\n" +
            "        <div class=\"invana-graph-viewer-query\">\n" +
            "            <form id=\"header-query-form\">\n" +
            "                <input name=\"query\" type=\"text\" placeholder=\"Query the Graph here. Example: g.V().limit(5).toList()\">\n" +
            "            </form>\n" +
            "        </div>\n" +
            "\n" +
            "    </nav>\n" +
            "    <section class=\"canvas-section\">\n" +
            "        <div id=\"graph-area-wrapper\" class=\"full-screen\">\n" +
            "            <svg id=\"graph-area\" width=\"100%\" height=\"100%\">\n" +
            "            </svg>\n" +
            "        </div>\n" +
            "    </section>\n" +
            "    <div id=\"legend-div\">\n" +
            "        <svg></svg>\n" +
            "    </div>\n" +
            "    <pre id=\"properties-div\"></pre>\n" +
            "    <div id=\"controls-div\">\n" +
            "    </div>\n" +
            "    <div id=\"notifications-div\"></div>\n" +
            "    <div id=\"connection-status\"><span></span></div>\n" +
            "</div>";

        $(this.html_selector_id).html($(html_structure));

    }

    start() {
        this.init_html();
        let graph_canvas = new DataGraphCanvas(this.canvas_selector_id);
        let response_handler = new GremlinResponseHandlers();

        let onMessageReceived = function (event) {
            let response = JSON.parse(event.data);
            console.log("onMessageReceived", response);
            let json_data = response_handler.process(response);
            console.log("json_data", json_data);

            show_notification("Rendered graph");
            let _ = response_handler.seperate_vertices_and_edges(json_data);
            let vertices = _[0];
            let edges = _[1];
            graph_canvas.draw(vertices, edges);
            hide_loading();

        };
        let gremlinConnector = new GremlinConnector(this.GREMLIN_SERVER_URL, onMessageReceived);
        let addQueryToUrl = function (query) {
            let u = new URL(location.href);
            var searchParams = new URLSearchParams(window.location.search);
            searchParams.set("query", query);
            if (window.history.replaceState) {
                //prevents browser from storing history with each change:
                window.history.replaceState({}, null, u.origin + u.pathname + "?" + searchParams.toString());
            }
        };

        let submitQuery = function (query, validate_query) {

            if (validate_query && !query) {
                alert("Query cannot be Blank");
            } else {
                if (query) { // soft ignore
                    let msg = {
                        "requestId": uuidv4(),
                        "op": "eval",
                        "processor": "",
                        "args": {
                            "gremlin": query,
                            "bindings": {},
                            "language": "gremlin-groovy"
                        }
                    };
                    show_loading();
                    $('[name="query"]').val(query);
                    addQueryToUrl(query);
                    gremlinConnector.send(msg);
                }
            }
        };
        let onPageLoadInitQuery = function () {
            let query = new URLSearchParams(window.location.search).get("query");
            submitQuery(query, false);

        };
        let onHeaderQuerySubmit = function (e) {
            e.preventDefault();
            let query = $('#header-query-form [name="query"]').val();
            console.log("query is ", query);
            submitQuery(query);
        };

        $("#header-query-form").submit(onHeaderQuerySubmit);

        gremlinConnector.ws.addEventListener('open', function (event) {
            onPageLoadInitQuery();
        });


    }
}

$(document).ready(function () {
    $('[name="vertex_label_toggle"]').change(function () {
        if ($(this).is(":checked")) {
            graph_canvas.controls.showVertexLabels();
        } else {
            graph_canvas.controls.hideVertexLabels();
        }
    });
    $('[name="edge_label_toggle"]').change(function () {
        if ($(this).is(":checked")) {
            graph_canvas.controls.showEdgeLabels();
        } else {
            graph_canvas.controls.hideEdgeLabels();
        }
    });
});