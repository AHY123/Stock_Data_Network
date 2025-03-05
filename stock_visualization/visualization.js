// Sample data
const sampleData = [
    { x: 10, y: 20, category: 'A' },
    { x: 15, y: 35, category: 'B' },
    { x: 25, y: 15, category: 'C' },
    { x: 30, y: 40, category: 'D' },
    { x: 35, y: 25, category: 'E' }
];

// Clear the visualization container
function clearVisualization() {
    d3.select('#visualization').html('');
}

// Scatter Plot
function showScatterPlot() {
    clearVisualization();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(sampleData, d => d.x)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(sampleData, d => d.y)])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.selectAll('circle')
        .data(sampleData)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 5)
        .style('fill', 'steelblue');
}

// Bar Chart
function showBarChart() {
    clearVisualization();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(sampleData.map(d => d.category))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(sampleData, d => d.y)])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.selectAll('rect')
        .data(sampleData)
        .enter()
        .append('rect')
        .attr('x', d => x(d.category))
        .attr('y', d => y(d.y))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.y))
        .style('fill', 'steelblue');
}

// Line Chart
function showLineChart() {
    clearVisualization();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select('#visualization')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([d3.min(sampleData, d => d.x), d3.max(sampleData, d => d.x)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(sampleData, d => d.y)])
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y));

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.append('path')
        .datum(sampleData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);
}

// Show scatter plot by default
showScatterPlot();