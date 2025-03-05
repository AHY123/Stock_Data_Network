function showLineChart() {
    clearVisualization();

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG with zoom support
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

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => {
            svg.attr('transform', event.transform);
        });

    d3.select('#visualization svg').call(zoom);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    // Create the line
    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y));

    // Add the line path
    svg.append('path')
        .datum(sampleData)
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Add interactive points
    svg.selectAll('.point')
        .data(sampleData)
        .enter()
        .append('circle')
        .attr('class', 'point')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 5)
        .style('fill', 'steelblue')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8);
                
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            tooltip.html(`X: ${d.x}<br/>Y: ${d.y}<br/>Date: ${d.date}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(500)
                .attr('r', 5);
                
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
} 