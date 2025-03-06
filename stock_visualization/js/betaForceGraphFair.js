function showBetaForceGraphFair() {
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
                if (typeof resetFilter === 'function') {
                    resetFilter();
                }
            }
        });

    // Add zoom behavior
    const g = svg.append('g');
    let currentScale = 1;  // Track current zoom scale

    // Create label groups first
    const nodeLabels = g.append('g')
        .attr('class', 'node-labels');

    const linkLabels = g.append('g')
        .attr('class', 'link-labels');

    // Set up zoom behavior after labels are created
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            currentScale = Math.max(event.transform.k * 0.5, 1);  // Update current scale
            // Update label sizes based on zoom level
            nodeLabels.selectAll('text')
                .style('font-size', `${8 / currentScale}px`);
            linkLabels.selectAll('text')
                .style('font-size', `${6 / currentScale}px`);
        });
    svg.call(zoom);

    // Add background group indicators
    const groupBackgrounds = g.append('g')
        .attr('class', 'group-backgrounds')
        .style('pointer-events', 'none');

    // Add fixed legend container (outside of zoomable group)
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${containerWidth - 180}, 50)`)
        .style('pointer-events', 'all');  // Ensure legend is interactive

    // Variables to store nodes and simulation
    let nodes = [];
    let simulation;
    let radiusScale;
    let color;

    // Add control buttons
    const controls = d3.select('.controls');

    // Clear any existing buttons
    controls.selectAll('button').remove();

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
                    .distanceMax(300))
                .force('collision', d3.forceCollide().radius(d => radiusScale(d.marketCap) * 2))
                .alpha(0.3)
                .restart();
        });

    controls.append('button')
        .text('Group by Sector')
        .on('click', () => {
            if (!simulation) return;
            
            // Get unique sectors
            const uniqueSectors = [...new Set(nodes.map(d => d.sector))];
            
            // Create a 4x3 grid of positions
            const gridWidth = 4;
            const gridHeight = 3;
            const cellWidth = containerWidth / (gridWidth + 1);
            const cellHeight = containerHeight / (gridHeight + 1);
            
            // Create mapping of sectors to positions
            const sectorPositions = {};
            
            // Fixed positions for Finance and Technology
            sectorPositions['Finance'] = {
                x: (2) * cellWidth,  // 2nd column
                y: (2) * cellHeight  // 2nd row
            };
            sectorPositions['Technology'] = {
                x: (3) * cellWidth,  // 3rd column
                y: (2) * cellHeight  // 2nd row
            };
            
            // Create array of remaining positions (excluding Finance and Technology positions)
            const remainingPositions = [];
            for (let y = 0; y < gridHeight; y++) {
                for (let x = 0; x < gridWidth; x++) {
                    // Skip the positions taken by Finance and Technology
                    if (!(x === 1 && y === 1) && !(x === 2 && y === 1)) {
                        remainingPositions.push({
                            x: (x + 1) * cellWidth,
                            y: (y + 1) * cellHeight
                        });
                    }
                }
            }
            
            // Randomly shuffle remaining positions
            for (let i = remainingPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remainingPositions[i], remainingPositions[j]] = [remainingPositions[j], remainingPositions[i]];
            }
            
            // Assign remaining sectors to random positions
            let positionIndex = 0;
            uniqueSectors.forEach(sector => {
                if (sector !== 'Finance' && sector !== 'Technology') {
                    if (positionIndex < remainingPositions.length) {
                        sectorPositions[sector] = remainingPositions[positionIndex];
                        positionIndex++;
                    } else {
                        // If we have more sectors than positions, place them randomly
                        sectorPositions[sector] = {
                            x: Math.random() * containerWidth,
                            y: Math.random() * containerHeight
                        };
                    }
                }
            });

            // Update background indicators
            groupBackgrounds.selectAll('rect')
                .data(uniqueSectors)
                .join(
                    enter => enter.append('rect')
                        .attr('width', cellWidth * 0.8)
                        .attr('height', cellHeight * 0.8)
                        .attr('rx', 10)
                        .attr('ry', 10)
                        .style('fill', d => color(d))
                        .style('opacity', 0.1)
                        .style('stroke', d => color(d))
                        .style('stroke-width', 2)
                        .style('stroke-opacity', 0.3),
                    update => update,
                    exit => exit.remove()
                )
                .attr('x', d => sectorPositions[d].x - (cellWidth * 0.4))
                .attr('y', d => sectorPositions[d].y - (cellHeight * 0.4));

            // Update forces to group nodes by sector
            simulation
                .force('x', d3.forceX(d => sectorPositions[d.sector].x).strength(1.5))
                .force('y', d3.forceY(d => sectorPositions[d.sector].y).strength(1.5))
                .alpha(0.3)
                .restart();
        });

    // Add rotation animation button
    let isRotating = false;
    let rotationAngle = 0;
    let rotationInterval;

    controls.append('button')
        .text('Toggle Rotation')
        .on('click', () => {
            isRotating = !isRotating;
            if (isRotating) {
                // Start rotation
                rotationInterval = setInterval(() => {
                    rotationAngle += 0.001; // Adjust speed by changing this value
                    const centerX = containerWidth / 2;
                    const centerY = containerHeight / 2;
                    
                    // Update node positions
                    nodes.forEach(d => {
                        const dx = d.x - centerX;
                        const dy = d.y - centerY;
                        const angle = Math.atan2(dy, dx) + (Math.PI / 180); // Convert degrees to radians
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        d.x = centerX + distance * Math.cos(angle);
                        d.y = centerY + distance * Math.sin(angle);
                    });
                    
                    // Update simulation
                    simulation.alpha(0.3).restart();
                }, 100); // Adjust interval for smoother/faster rotation
            } else {
                // Stop rotation
                clearInterval(rotationInterval);
            }
        });

    // Load the graph data
    d3.json('data/beta_stock_graph_fair.json').then(graph => {
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
            value: d.value || 0  // Default to 0 for beta values
        }));

        // Map nodes with proper sector handling
        nodes = graph.nodes.map(d => {
            // Use group as the sector
            const sector = d.group || 'Unknown';
            
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

        // Create a scale for node sizes based on market cap
        radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(nodes, d => d.marketCap)])
            .range([3, 15]);  // Min radius 3, max radius 15

        // Create a simulation with several forces
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(d => {
                    // Base distance plus node sizes
                    const baseDistance = 50 + radiusScale(d.source.marketCap) + radiusScale(d.target.marketCap);
                    // For beta values:
                    // -1 means strong repulsion (long distance)
                    // 0 means neutral (base distance)
                    // 1 means strong attraction (short distance)
                    return baseDistance + (1 - d.value) * 10;
                })
                .strength(d => {
                    // Convert beta value to strength
                    // -1 -> 0 (no attraction)
                    // 0 -> 0.5 (neutral)
                    // 1 -> 1 (strong attraction)
                    return (d.value + 1) / 4;
                }))
            .force('charge', d3.forceManyBody()
                .strength(d => {
                    // Calculate total link value for this node
                    const nodeLinks = links.filter(l => l.source.id === d.id || l.target.id === d.id);
                    const totalValue = nodeLinks.reduce((sum, l) => sum + Math.abs(l.value), 0);
                    // Convert to negative value for repulsion (higher value = stronger repulsion)
                    return -(totalValue ** 0.2) * 10;
                })
                .distanceMax(300))
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
            .attr('stroke-opacity', d => Math.abs(d.value) * 0.3)  // Opacity scales with absolute value
            .attr('stroke-width', d => Math.abs(d.value) * 2);  // Width proportional to absolute value

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
                    Market Cap: $${d.marketCap.toLocaleString()}B<br/>
                    Price: ${d.price}<br/>
                    Group: ${d.group}<br/>
                    Connected Nodes: ${links.filter(l => l.source.id === d.id || l.target.id === d.id).length}
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

        // Move label groups to the end of the g element to ensure they're on top
        g.node().appendChild(nodeLabels.node());
        g.node().appendChild(linkLabels.node());

        // Move legend to the end of SVG to ensure it's on top
        svg.node().appendChild(legend.node());

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

        // Function to hide node labels
        function hideNodeLabels() {
            nodeLabels.selectAll('text').remove();
            linkLabels.selectAll('text').remove();
        }

        // Add a function to hide background indicators
        function hideGroupBackgrounds() {
            groupBackgrounds.selectAll('rect').remove();
        }

        // Update the resetFilter function to hide labels and backgrounds
        function resetFilter() {
            // Hide node labels and group backgrounds
            hideNodeLabels();
            hideGroupBackgrounds();

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
                                Price: $${d.price}<br/>
                                Group: ${d.group}<br/>
                                Connected Nodes: ${links.filter(l => l.source.id === d.id || l.target.id === d.id).length}
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
                        .attr('stroke-opacity', d => Math.abs(d.value) * 0.7)
                        .attr('stroke-width', d => Math.abs(d.value) * 2),
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
        console.log('Creating legend items for sectors:', sectors);
        const legendItems = legend.selectAll('.legend-item')
            .data(sectors)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`)
            .style('cursor', 'pointer')
            .style('pointer-events', 'all')  // Ensure each item is interactive
            .on('click', function(event, d) {
                console.log('Legend click event:', {
                    sector: d,
                    currentNodes: nodes.length,
                    totalNodes: graph.nodes.length,
                    isFiltered: nodes.length < graph.nodes.length
                });
                event.stopPropagation();
                // If we're already in filtered mode (nodes.length < original nodes length), reset
                if (nodes.length < graph.nodes.length) {
                    console.log('Resetting filter...');
                    resetFilter();
                } else {
                    console.log('Filtering by sector:', d);
                    filterBySector(d);
                    showSectorLabels(d);
                }
            })
            .on('mouseover', function(event, d) {
                console.log('Legend mouseover event:', {
                    sector: d,
                    nodes: nodes.length,
                    links: links.length,
                    event: event
                });
                // Highlight nodes of selected sector
                node.transition()
                    .duration(200)
                    .style('opacity', n => {
                        const opacity = n.sector === d ? 1 : 0.2;
                        console.log(`Node ${n.id} opacity:`, opacity);
                        return opacity;
                    });
                
                // Highlight links connected to selected sector nodes
                link.transition()
                    .duration(200)
                    .style('opacity', l => {
                        const opacity = l.source.sector === d || l.target.sector === d ? 
                            Math.abs(l.value) * 0.7 : 0.1;
                        console.log(`Link ${l.source.id}-${l.target.id} opacity:`, opacity);
                        return opacity;
                    });

                // Highlight the background indicator for the selected sector
                groupBackgrounds.selectAll('rect')
                    .transition()
                    .duration(200)
                    .style('opacity', rect => {
                        const opacity = rect.__data__ === d ? 0.3 : 0.1;
                        console.log(`Background ${rect.__data__} opacity:`, opacity);
                        return opacity;
                    });
            })
            .on('mouseout', function(event, d) {
                console.log('Legend mouseout event:', {
                    sector: d,
                    nodes: nodes.length,
                    links: links.length,
                    event: event
                });
                // Reset all nodes and links to original opacity
                node.transition()
                    .duration(200)
                    .style('opacity', 1);
                
                link.transition()
                    .duration(200)
                    .style('opacity', l => Math.abs(l.value) * 0.7);

                // Reset background indicators opacity
                groupBackgrounds.selectAll('rect')
                    .transition()
                    .duration(200)
                    .style('opacity', 0.1);
            });

        console.log('Legend items created:', legendItems.size());

        // Add colored rectangles
        legendItems.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', d => color(d));

        // Add sector labels
        legendItems.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .text(d => d);

        // Add legend title
        legend.append('text')
            .attr('x', 0)
            .attr('y', -5)
            .text('Sectors')
            .attr('class', 'legend-title');

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
                                Group: ${d.group}<br/>
                                Connected Nodes: ${links.filter(l => l.source.id === d.id || l.target.id === d.id).length}
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
                        .attr('stroke-opacity', d => Math.abs(d.value) * 0.7)
                        .attr('stroke-width', d => Math.abs(d.value) * 2),
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
                                Group: ${d.group}<br/>
                                Connected Nodes: ${links.filter(l => l.source.id === d.id || l.target.id === d.id).length}
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
                        .attr('stroke-opacity', d => Math.abs(d.value) * 0.7)
                        .attr('stroke-width', d => Math.abs(d.value) * 2),
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
                        .attr('dy', d => (radiusScale(d.marketCap) ** 0.5) * 1)
                        .text(d => d.id),
                    update => update,
                    exit => exit.remove()
                );

            // Update link labels
            linkLabels.selectAll('text')
                .data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('text')
                        .attr('dy', 0)
                        .text(d => d.value.toFixed(2)),
                    update => update,
                    exit => exit.remove()
                );
        }

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
                        .attr('dy', d => (radiusScale(d.marketCap) ** 0.5) * 1)
                        .text(d => d.id),
                    update => update,
                    exit => exit.remove()
                );

            // Update link labels
            linkLabels.selectAll('text')
                .data(filteredLinks, d => `${d.source.id}-${d.target.id}`)
                .join(
                    enter => enter.append('text')
                        .attr('dy', 0)
                        .text(d => d.value.toFixed(2)),
                    update => update,
                    exit => exit.remove()
                );
        }
    }).catch(error => {
        console.error('Error loading data:', error);
    });
} 