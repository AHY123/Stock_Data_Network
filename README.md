# Stock_Data_Network

An interactive visualization tool for analyzing stock relationships through network graphs.

## Overview
This project provides visualizations of stock relationships using different correlation metrics:
- Pearson correlation-based force-directed graphs
- Beta coefficient-based force-directed graphs
- Fair beta coefficient visualization

## Features
- Interactive D3.js visualizations
- Multiple view options for different correlation metrics
- Stock data organized by market sectors
- Market cap and price information display

## Project Structure
- `/stock_visualization`: Web-based visualization interface
- `/workflow`: Jupyter notebooks for data processing and correlation analysis
- `/data`: Raw and processed stock market data


## Data Processing
The workflow directory contains various Jupyter notebooks that:
- Calculate Pearson correlations between stocks
- Compute beta coefficients
- Perform hypothesis testing on correlations
- Generate network graph data

## Technologies
- D3.js for interactive visualizations
- Python for data analysis and processing
- Jupyter notebooks for workflow documentation

## License
See the LICENSE file for details.