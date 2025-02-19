import numpy as np
import scipy.stats as sp

def standardize(X):
    return (X - np.mean(X)) / np.std(X)

def pct_change(X):
    return np.diff(X) / X[:-1] * 100

def remove_outliers(X, Y, threshold=3):
    """
    Remove outliers from paired arrays X and Y.
    If a value is an outlier in either X or Y, both corresponding values are removed.
    
    Args:
        X, Y: numpy arrays of same length
        threshold: number of standard deviations to consider a point an outlier
    
    Returns:
        X_clean, Y_clean: numpy arrays with outliers removed
    """
    # Convert to numpy arrays if not already
    X = np.array(X)
    Y = np.array(Y)
    
    # Calculate z-scores for both arrays
    z_scores_X = np.abs((X - np.mean(X)) / np.std(X))
    z_scores_Y = np.abs((Y - np.mean(Y)) / np.std(Y))
    
    # Create mask for values to keep (not outliers in either array)
    mask = (z_scores_X < threshold) & (z_scores_Y < threshold)
    
    # Return filtered arrays
    return X[mask], Y[mask]

def compute_pearson(stock_returns_1, stock_returns_2):
    """
    Compute Pearson correlation coefficient between two stocks based on their daily returns.
    
    Parameters:
    - stock_returns_1: numpy array of first stock's returns
    - stock_returns_2: numpy array of second stock's returns
    
    Returns:
    - Pearson correlation coefficient
    """
    return sp.stats.pearsonr(stock_returns_1, stock_returns_2)[0]




def rolling_beta(stock_returns, market_returns, window):
    """
    Compute rolling beta of a stock relative to the market.
    
    Parameters:
    - stock_returns: numpy array of stock returns
    - market_returns: numpy array of market returns
    - window: rolling window size (e.g., 30 for 30-day rolling beta)
    
    Returns:
    - numpy array of rolling beta values (NaN for the first (window-1) values)
    """
    betas = np.full(len(stock_returns), np.nan)  # Initialize with NaNs

    for i in range(window, len(stock_returns)):
        # Extract rolling window slices
        r_s = stock_returns[i-window:i]  # Stock returns for window
        r_m = market_returns[i-window:i]  # Market returns for window
        
        # Compute covariance and variance
        cov_matrix = np.cov(r_s, r_m)
        cov_stock_market = cov_matrix[0, 1]
        var_market = cov_matrix[1, 1]
        
        # Compute beta
        betas[i] = cov_stock_market / var_market if var_market != 0 else np.nan  # Avoid division by zero

    return betas

def compute_beta_correlation(stock_returns_1, stock_returns_2, market_returns, window):
    betas_1 = rolling_beta(stock_returns_1, market_returns, window)[window:]
    betas_2 = rolling_beta(stock_returns_2, market_returns, window)[window:]
    return np.corrcoef(betas_1, betas_2)[0, 1]

def compute_r_squared(stock_returns_1, stock_returns_2):
    """
    Compute R^2 between two stocks based on their daily returns.
    
    Parameters:
    - stock_returns_1: numpy array of first stock's returns
    - stock_returns_2: numpy array of second stock's returns
    
    Returns:
    - R^2 value
    """
    # Compute Pearson correlation coefficient
    correlation_matrix = np.corrcoef(stock_returns_1, stock_returns_2)
    correlation = correlation_matrix[0, 1]  # Extract correlation value
    
    # Compute R^2
    r_squared = correlation ** 2
    return r_squared

def compute_correlation_metrics(stock_returns_1, stock_returns_2, market_returns, window):
    """
    Compute all correlation metrics at once to avoid redundant calculations.
    
    Returns:
    - pearson_corr: Pearson correlation coefficient
    - beta_corr: Beta correlation
    - r_squared: R-squared value
    """
    # Compute correlation matrix once
    corr_matrix = np.corrcoef(stock_returns_1, stock_returns_2)
    pearson_corr = corr_matrix[0, 1]
    r_squared = pearson_corr ** 2
    
    # Compute rolling betas efficiently
    betas_1 = np.full(len(stock_returns_1), np.nan)
    betas_2 = np.full(len(stock_returns_2), np.nan)
    
    # Pre-calculate market variance for the rolling windows
    market_var = np.array([np.var(market_returns[i-window:i]) 
                          for i in range(window, len(market_returns))])
    
    # Compute rolling betas for both stocks simultaneously
    for i in range(window, len(stock_returns_1)):
        window_slice = slice(i-window, i)
        cov_matrix = np.cov(np.vstack([
            stock_returns_1[window_slice],
            stock_returns_2[window_slice],
            market_returns[window_slice]
        ]))
        
        # Extract covariances with market
        cov_stock1_market = cov_matrix[0, 2]
        cov_stock2_market = cov_matrix[1, 2]
        var_market = cov_matrix[2, 2]
        
        if var_market != 0:
            betas_1[i] = cov_stock1_market / var_market
            betas_2[i] = cov_stock2_market / var_market
    
    # Compute beta correlation
    valid_betas = ~np.isnan(betas_1[window:]) & ~np.isnan(betas_2[window:])
    beta_corr = np.corrcoef(betas_1[window:][valid_betas], 
                           betas_2[window:][valid_betas])[0, 1]
    
    return pearson_corr, beta_corr, r_squared