function showForceDirectedGraph() {
    clearVisualization();

    // Get container dimensions
    const container = d3.select('#visualization');
    const containerWidth = container.node().getBoundingClientRect().width;
    const containerHeight = container.node().getBoundingClientRect().height;

    // Create tooltip div
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Create SVG container with responsive dimensions
    const svg = container
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, containerWidth, containerHeight])
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .on('click', function(event) {
            // Only trigger if clicking the background (not nodes or links)
            if (event.target === this) {
                resetFilter();
            }
        });

    // Add zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    svg.call(zoom);

    // Add fixed legend container (outside of zoomable group)
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${containerWidth - 150}, 20)`);

    // Variables to store nodes and simulation
    let nodes = [];
    let simulation;
    let radiusScale;
    let color;

    // Add control buttons
    const controls = container
        .append('div')
        .attr('class', 'controls')
        .style('position', 'absolute')
        .style('top', '150px')
        .style('left', '50px')
        .style('z-index', '1000');

    // Add zoom control buttons
    controls.append('button')
        .text('Zoom In')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 1.3);
        });

    controls.append('button')
        .text('Zoom Out')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.scaleBy, 0.7);
        });

    controls.append('button')
        .text('Reset Zoom')
        .on('click', () => {
            svg.transition()
                .duration(300)
                .call(zoom.transform, d3.zoomIdentity);
        });

    controls.append('button')
        .text('Reset Layout')
        .on('click', () => {
            if (!nodes.length) return;
            nodes.forEach(d => {
                d.x = containerWidth / 2;
                d.y = containerHeight / 2;
                d.vx = 0;
                d.vy = 0;
            });
            simulation.alpha(0.3).restart();
        });

    controls.append('button')
        .text('Untangle')
        .on('click', () => {
            if (!simulation) return;
            simulation
                .force('charge', d3.forceManyBody()
                    .strength(-100)
                    .distanceMax(200))
                .force('collision', d3.forceCollide().radius(d => radiusScale(d.marketCap) * 2))
                .alpha(0.3)
                .restart();
        });

    controls.append('button')
        .text('Group by Sector')
        .on('click', () => {
            if (!simulation) return;
            simulation
                .force('x', d3.forceX(d => {
                    const sectorX = d.sector === 'Technology' ? containerWidth * 0.25 :
                                  d.sector === 'Finance' ? containerWidth * 0.5 :
                                  d.sector === 'Healthcare' ? containerWidth * 0.75 :
                                  containerWidth * 0.5;
                    return sectorX;
                }).strength(0.5))
                .force('y', d3.forceY(containerHeight / 2).strength(0.5))
                .alpha(0.3)
                .restart();
        });

    // Load the graph data
    d3.json('data/stock_graph.json').then(graph => {
        // Create a map of node IDs to ensure they exist
        const nodeMap = new Map(graph.nodes.map(d => [d.id, d]));

        // Filter out links that reference non-existent nodes
        const validLinks = graph.links.filter(link => {
            const sourceExists = nodeMap.has(link.source);
            const targetExists = nodeMap.has(link.target);
            if (!sourceExists || !targetExists) {
                console.warn('Invalid link:', link);
                return false;
            }
            return true;
        });

        // Create copies of the data
        const links = validLinks.map(d => ({
            source: d.source,
            target: d.target,
            value: d.value || 1
        }));

        // Debug: Log raw nodes data
        console.log('Raw nodes data:', graph.nodes);

        // Map nodes with proper sector handling
        nodes = graph.nodes.map(d => {
            // Use group as the sector
            const sector = d.group || 'Unknown';
            // console.log('Node sector:', d.id, sector); // Debug log for each node's sector
            
            return {
                id: d.id,
                group: d.group || 0,
                sector: sector,
                marketCap: d.marketCap || 0,
                price: d.price || 'N/A'
            };
        });

        // Get unique sectors and set up color scale
        const sectors = [...new Set(nodes.map(d => d.sector))];
        console.log('Unique sectors:', sectors);
        
        // Create a custom color mapping for sectors
        const sectorColors = [
            '#4e79a7',  // Technology (1)
            '#f28e2c',  // Finance (2)
            '#e15759',  // Healthcare (3)
            '#76b7b2',  // Consumer (4)
            '#59a14f',  // Industrial (5)
            '#edc949',  // Energy (6)
            '#af7aa1',  // Materials (7)
            '#ff9da7',  // Utilities (8)
            '#9c755f'   // Unknown
        ];

        // Set up color scale with custom colors
        color = d3.scaleOrdinal()
            .domain(sectors)
            .range(sectorColors);

        // Debug: Log color mapping
        console.log('Color mapping:', sectors.map(s => ({sector: s, color: color(s)})));
        console.log('Sample node colors:', nodes.slice(0, 5).map(d => ({id: d.id, sector: d.sector, color: color(d.sector)})));

        // Create a scale for node sizes based on market cap
        radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.marketCap)])
            .range([3, 15]);  // Min radius 3, max radius 15

        // Debug: Log processed data
        // console.log('Processed Nodes:', nodes);
        // console.log('Processed Links:', links);
        console.log('Sectors:', sectors);

        // Create a simulation with several forces
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(d => {
                    // Base distance plus node sizes
                    const baseDistance = 10 + radiusScale(d.source.marketCap) + radiusScale(d.target.marketCap);
                    // For value close to 0, distance will be around 50
                    // For value close to 1, distance will be around 10
                    return baseDistance + (1 - (d.value || 1)) * 40;
                })
                .strength(0.5))  // Fixed strength for links
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    // Calculate total link value for this node
                    const nodeLinks = links.filter(l => l.source.id === d.id || l.target.id === d.id);
                    const totalValue = nodeLinks.reduce((sum, l) => sum + (l.value || 1), 0);
                    // Convert to negative value for repulsion (higher value = stronger repulsion)
                    return -(totalValue ** 0.5) * 20;
                })
                // .distanceMin(50)
                .distanceMax(100))
            .force('center', d3.forceCenter(containerWidth / 2, containerHeight / 2))
            .force('collision', d3.forceCollide().radius(d => radiusScale(d.marketCap) ** 0.5))
            .force('x', d3.forceX(containerWidth / 2).strength(0.1))
            .force('y', d3.forceY(containerHeight / 2).strength(0.1))
            .on('tick', ticked);

        // Add a line for each link
        const link = g.append('g')
            .attr('stroke', '#000')
            .selectAll('line')
      .data(links)
            .join('line')
            .attr('stroke-opacity', d => (d.value || 1) * 0.7)  // Opacity scales with value
            .attr('stroke-width', d => (d.value || 1) * 2);  // Width proportional to link value

        // Add a circle for each node
        const node = g.append('g')
            .attr('stroke', '#666')
            .attr('stroke-width', 1)
            .selectAll('circle')
      .data(nodes)
            .join('circle')
            .attr('r', d => (radiusScale(d.marketCap) ** 0.5) * 2)
            .attr('fill', d => color(d.sector))
            .on('click', function(event, d) {
                event.stopPropagation(); // Prevent background click
                // If we're already in filtered mode (nodes.length < original nodes length), reset
                if (nodes.length < graph.nodes.length) {
                    resetFilter();
                } else {
                    filterGraph(d);
                    showNodeLabels(d);
                }
            })
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2.5);

                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                tooltip.html(`
                    <strong>${d.id}</strong><br/>
                    Sector: ${d.sector}<br/>
                    Market Cap (B): ${d.marketCap.toLocaleString()}<br/>
                    Price: ${d.price}<br/>
                    Group: ${d.group}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2);
                    
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        // Create a group for node labels
        const nodeLabels = g.append('g')
            .attr('class', 'node-labels')
            .style('pointer-events', 'none');

        // Create a group for link labels
        const linkLabels = g.append('g')
            .attr('class', 'link-labels')
            .style('pointer-events', 'none');

        // Function to show node labels
        function showNodeLabels(selectedNode) {
            // Get all connected nodes and links where selected node is source or target
            const connectedNodes = new Set();
            connectedNodes.add(selectedNode.id);
            
            // Find all links where selected node is source or target
            const filteredLinks = links.filter(link => 
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
            );
            
            // Add the other nodes from these links
            filteredLinks.forEach(link => {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            });

            // Filter nodes to only include those in the filtered links
            const filteredNodes = nodes.filter(d => connectedNodes.has(d.id));

            // Update node labels
            nodeLabels.selectAll('text')
                .data(filteredNodes, d => d.id)
                .join(
                    enter => enter.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', d => (radiusScale(d.marketCap) ** 0.5) * 1)
                        .style('font-size', '8px')
                        .style('fill', '#333')
                        .style('font-weight', 'bold')
                        .text(d => d.id),
                    update => update,
                    exit => exit.remove()
                );

            // Update link labels
            linkLabels.selectAll('text')
                .data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', 0)
                        .style('font-size', '6px')
                        .style('fill', '#111')
                        .style('font-weight', 'bold')
                        .text(d => d.value.toFixed(2)),
                    update => update,
                    exit => exit.remove()
                );
        }

        // Function to hide node labels
        function hideNodeLabels() {
            nodeLabels.selectAll('text').remove();
            linkLabels.selectAll('text').remove();
        }

        // Update positions on each tick
        function ticked() {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            // Update label positions
            nodeLabels.selectAll('text')
                .attr('x', d => d.x)
                .attr('y', d => d.y);

            // Update link label positions
            linkLabels.selectAll('text')
                .attr('x', d => (d.source.x + d.target.x) / 2)
                .attr('y', d => (d.source.y + d.target.y) / 2);
        }

        // Update the resetFilter function to hide labels
        function resetFilter() {
            // Hide node labels
            hideNodeLabels();

            // Reset the simulation with all data
            simulation.nodes(nodes);
            simulation.force('link').links(links);
            simulation.alpha(0.3).restart();

            // Reset the visualization
            node.data(nodes, d => d.id)
                .join(
                    enter => enter.append('circle')
                        .attr('r', d => (radiusScale(d.marketCap) ** 0.5) * 2)
                        .attr('fill', d => color(d.sector))
                        .call(d3.drag()
                            .on('start', dragstarted)
                            .on('drag', dragged)
                            .on('end', dragended))
                        .on('click', function(event, d) {
                            event.stopPropagation();
                            filterGraph(d);
                        })
                        .on('mouseover', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2.5);

                            tooltip.transition()
                                .duration(200)
                                .style('opacity', .9);
                            tooltip.html(`
                                <strong>${d.id}</strong><br/>
                                Sector: ${d.sector}<br/>
                                Market Cap (B): $${d.marketCap.toLocaleString()}<br/>
                                Price: ${d.price}<br/>
                                Group: ${d.group}
                            `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                        })
                        .on('mouseout', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(500)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2);
                                
                            tooltip.transition()
                                .duration(500)
                                .style('opacity', 0);
                        }),
                    update => update,
                    exit => exit.remove()
                );

            link.data(links, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('line')
                        .attr('stroke', '#000')
                        .attr('stroke-opacity', d => (d.value || 1) * 0.7)
                        .attr('stroke-width', d => (d.value || 1) * 2),
                    update => update,
                    exit => exit.remove()
                );
        }

        // Add drag behavior
    node.call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

        // Drag functions
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
  
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
  
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
  
        // Create legend items
        const legendItems = legend.selectAll('.legend-item')
            .data(sectors)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`)
            .style('cursor', 'pointer')
            .on('click', function(event, d) {
                event.stopPropagation();
                // If we're already in filtered mode (nodes.length < original nodes length), reset
                if (nodes.length < graph.nodes.length) {
                    resetFilter();
                } else {
                    filterBySector(d);
                    showSectorLabels(d);
                }
            })
            .on('mouseover', function(event, d) {
                // Highlight nodes of selected sector
                node.transition()
                    .duration(200)
                    .style('opacity', n => n.sector === d ? 1 : 0.2);
                
                // Highlight links connected to selected sector nodes
                link.transition()
                    .duration(200)
                    .style('opacity', l => 
                        l.source.sector === d || l.target.sector === d ? 
                        (l.value || 1) * 0.7 : 0.1);
            })
            .on('mouseout', function(event, d) {
                // Reset all nodes and links to original opacity
                node.transition()
                    .duration(200)
                    .style('opacity', 1);
                
                link.transition()
                    .duration(200)
                    .style('opacity', l => (l.value || 1) * 0.7);
            });

        // Add colored rectangles
        legendItems.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => color(d));

        // Add sector labels
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(d => d)
            .style('font-size', '12px')
            .style('fill', '#333');

        // Add legend title
        legend.append('text')
            .attr('x', 0)
            .attr('y', -5)
            .text('Sectors')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333');

        // Add resize handler
        window.addEventListener('resize', function() {
            const newWidth = container.node().getBoundingClientRect().width;
            const newHeight = container.node().getBoundingClientRect().height;
            
            // Update SVG viewBox
            svg.attr('viewBox', [0, 0, newWidth, newHeight]);
            
            // Update legend position
            legend.attr('transform', `translate(${newWidth - 150}, 20)`);
            
            // Update simulation center if it exists
            if (simulation) {
                simulation
                    .force('center', d3.forceCenter(newWidth / 2, newHeight / 2))
                    .force('x', d3.forceX(newWidth / 2).strength(0.1))
                    .force('y', d3.forceY(newHeight / 2).strength(0.1))
                    .alpha(0.3)
                    .restart();
            }
        });

        // Function to filter nodes and links
        function filterGraph(selectedNode) {
            // Get all connected nodes and links where selected node is source or target
            const connectedNodes = new Set();
            connectedNodes.add(selectedNode.id);
            
            // Find all links where selected node is source or target
            const filteredLinks = links.filter(link => 
                link.source.id === selectedNode.id || link.target.id === selectedNode.id
            );
            
            // Add the other nodes from these links
            filteredLinks.forEach(link => {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            });

            // Filter nodes to only include those in the filtered links
            const filteredNodes = nodes.filter(d => connectedNodes.has(d.id));

            // Update the simulation with filtered data
            simulation.nodes(filteredNodes);
            simulation.force('link').links(filteredLinks);
            simulation.alpha(0.3).restart();

            // Update the visualization
            node.data(filteredNodes, d => d.id)
                .join(
                    enter => enter.append('circle')
                        .attr('r', d => (radiusScale(d.marketCap) ** 0.5) * 2)
                        .attr('fill', d => color(d.sector))
                        .call(d3.drag()
                            .on('start', dragstarted)
                            .on('drag', dragged)
                            .on('end', dragended))
                        .on('click', function(event, d) {
                            event.stopPropagation();
                            filterGraph(d);
                        })
                        .on('mouseover', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2.5);

                            tooltip.transition()
                                .duration(200)
                                .style('opacity', .9);
                            tooltip.html(`
                                <strong>${d.id}</strong><br/>
                                Sector: ${d.sector}<br/>
                                Market Cap (B): $${d.marketCap.toLocaleString()}<br/>
                                Price: $${d.price}<br/>
                                Group: ${d.group}
                            `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                        })
                        .on('mouseout', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(500)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2);
                                
                            tooltip.transition()
                                .duration(500)
                                .style('opacity', 0);
                        }),
                    update => update,
                    exit => exit.remove()
                );

            link.data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('line')
                        .attr('stroke', '#000')
                        .attr('stroke-opacity', d => (d.value || 1) * 0.7)
                        .attr('stroke-width', d => (d.value || 1) * 2),
                    update => update,
                    exit => exit.remove()
                );
        }

        // Function to filter by sector
        function filterBySector(selectedSector) {
            // Get all nodes in the selected sector
            const sectorNodes = nodes.filter(d => d.sector === selectedSector);
            
            // Get all connected nodes and links
            const connectedNodes = new Set();
            sectorNodes.forEach(node => {
                connectedNodes.add(node.id);
            });
            
            // Find all links connected to sector nodes
            const filteredLinks = links.filter(link => 
                sectorNodes.some(n => n.id === link.source.id) || 
                sectorNodes.some(n => n.id === link.target.id)
            );
            
            // Add all nodes connected to sector nodes
            filteredLinks.forEach(link => {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            });

            // Filter nodes to only include those in the filtered links
            const filteredNodes = nodes.filter(d => connectedNodes.has(d.id));

            // Update the simulation with filtered data
            simulation.nodes(filteredNodes);
            simulation.force('link').links(filteredLinks);
            simulation.alpha(0.3).restart();

            // Update the visualization
            node.data(filteredNodes, d => d.id)
                .join(
                    enter => enter.append('circle')
                        .attr('r', d => (radiusScale(d.marketCap) ** 0.5) * 2)
                        .attr('fill', d => color(d.sector))
                        .call(d3.drag()
                            .on('start', dragstarted)
                            .on('drag', dragged)
                            .on('end', dragended))
                        .on('click', function(event, d) {
                            event.stopPropagation();
                            filterGraph(d);
                        })
                        .on('mouseover', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2.5);

                            tooltip.transition()
                                .duration(200)
                                .style('opacity', .9);
                            tooltip.html(`
                                <strong>${d.id}</strong><br/>
                                Sector: ${d.sector}<br/>
                                Market Cap (B): $${d.marketCap.toLocaleString()}<br/>
                                Price: $${d.price}<br/>
                                Group: ${d.group}
                            `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                        })
                        .on('mouseout', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(500)
                                .attr('r', (radiusScale(d.marketCap) ** 0.5) * 2);
                                
                            tooltip.transition()
                                .duration(500)
                                .style('opacity', 0);
                        }),
                    update => update,
                    exit => exit.remove()
                );

            link.data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('line')
                        .attr('stroke', '#000')
                        .attr('stroke-opacity', d => (d.value || 1) * 0.7)
                        .attr('stroke-width', d => (d.value || 1) * 2),
                    update => update,
                    exit => exit.remove()
                );
        }

        // Function to show sector labels
        function showSectorLabels(selectedSector) {
            // Get all nodes in the selected sector
            const sectorNodes = nodes.filter(d => d.sector === selectedSector);
            
            // Find all links connected to sector nodes
            const filteredLinks = links.filter(link => 
                sectorNodes.some(n => n.id === link.source.id) || 
                sectorNodes.some(n => n.id === link.target.id)
            );
            
            // Get all connected nodes
            const connectedNodes = new Set();
            filteredLinks.forEach(link => {
                connectedNodes.add(link.source.id);
                connectedNodes.add(link.target.id);
            });

            // Filter nodes to only include those in the filtered links
            const filteredNodes = nodes.filter(d => connectedNodes.has(d.id));

            // Update node labels
            nodeLabels.selectAll('text')
                .data(filteredNodes, d => d.id)
                .join(
                    enter => enter.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', d => (radiusScale(d.marketCap) ** 0.5) * 1)
                        .style('font-size', '8px')
                        .style('fill', '#333')
                        .style('font-weight', 'bold')
                        .text(d => d.id),
                    update => update,
                    exit => exit.remove()
                );

            // Update link labels
            linkLabels.selectAll('text')
                .data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('text')
                        .attr('text-anchor', 'middle')
                        .attr('dy', 0)
                        .style('font-size', '6px')
                        .style('fill', '#111')
                        .style('font-weight', 'bold')
                        .text(d => d.value.toFixed(2)),
                    update => update,
                    exit => exit.remove()
                );
        }
    }).catch(error => {
        console.error('Error loading data:', error);
    });
  }