// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Sample data
const sampleData = [
    { x: 10, y: 20, category: 'A', date: '2024-01-01' },
    { x: 15, y: 35, category: 'B', date: '2024-01-02' },
    { x: 25, y: 15, category: 'C', date: '2024-01-03' },
    { x: 30, y: 40, category: 'D', date: '2024-01-04' },
    { x: 35, y: 25, category: 'E', date: '2024-01-05' }
];

function clearVisualization() {
    d3.select('#visualization').html('');
}

// Load the graph data
d3.json("data/graph.json").then(function(data) {
    window.graphData = data;
}); 