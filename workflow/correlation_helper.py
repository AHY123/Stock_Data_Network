import numpy as np
from numba import njit

@njit
def standardize(X):
    return (X - np.mean(X)) / np.std(X)

@njit
def pct_change(X):
    return np.diff(X) / X[:-1] * 100

@njit
def remove_outliers(X, Y, threshold=3):
    """
    Remove outliers from paired arrays X and Y.
    If a value is an outlier in either X or Y, both corresponding values are removed.
    """
    # Convert to numpy arrays if not already
    X = np.asarray(X)
    Y = np.asarray(Y)
    
    # Calculate z-scores for both arrays
    z_scores_X = np.abs((X - np.mean(X)) / np.std(X))
    z_scores_Y = np.abs((Y - np.mean(Y)) / np.std(Y))
    
    # Create mask for values to keep (not outliers in either array)
    mask = (z_scores_X < threshold) & (z_scores_Y < threshold)
    
    # Return filtered arrays
    return X[mask], Y[mask]

@njit
def compute_pearson(x, y):
    """
    Compute Pearson correlation coefficient using numba-compatible operations.
    """
    n = len(x)
    mean_x = np.mean(x)
    mean_y = np.mean(y)
    std_x = np.std(x)
    std_y = np.std(y)
    
    if std_x == 0 or std_y == 0:
        return 0.0
        
    sum_xy = 0.0
    for i in range(n):
        sum_xy += (x[i] - mean_x) * (y[i] - mean_y)
        
    return sum_xy / (n * std_x * std_y)

@njit
def rolling_beta(stock_returns, market_returns, window):
    """
    Compute rolling beta of a stock relative to the market.
    """
    betas = np.full(len(stock_returns), np.nan)

    for i in range(window, len(stock_returns)):
        # Extract rolling window slices
        r_s = stock_returns[i-window:i]
        r_m = market_returns[i-window:i]
        
        # Compute means
        mean_s = np.mean(r_s)
        mean_m = np.mean(r_m)
        
        # Compute covariance and variance manually
        sum_cov = 0.0
        sum_var = 0.0
        for j in range(window):
            dev_s = r_s[j] - mean_s
            dev_m = r_m[j] - mean_m
            sum_cov += dev_s * dev_m
            sum_var += dev_m * dev_m
        
        cov_stock_market = sum_cov / (window - 1)
        var_market = sum_var / (window - 1)
        
        # Compute beta
        betas[i] = cov_stock_market / var_market if var_market != 0 else np.nan

    return betas

@njit
def compute_correlation_metrics(stock_returns_1, stock_returns_2, market_returns, window):
    """
    Compute all correlation metrics at once using numba-compatible operations.
    """
    # Compute Pearson correlation
    pearson_corr = compute_pearson(stock_returns_1, stock_returns_2)
    r_squared = pearson_corr * pearson_corr
    
    # Compute rolling betas
    betas_1 = np.full(len(stock_returns_1), np.nan)
    betas_2 = np.full(len(stock_returns_2), np.nan)
    
    # Compute rolling betas for both stocks
    for i in range(window, len(stock_returns_1)):
        window_slice = slice(i-window, i)
        r_s1 = stock_returns_1[window_slice]
        r_s2 = stock_returns_2[window_slice]
        r_m = market_returns[window_slice]
        
        # Compute means
        mean_s1 = np.mean(r_s1)
        mean_s2 = np.mean(r_s2)
        mean_m = np.mean(r_m)
        
        # Compute covariances and variances manually
        sum_cov1 = 0.0
        sum_cov2 = 0.0
        sum_var = 0.0
        for j in range(window):
            dev_s1 = r_s1[j] - mean_s1
            dev_s2 = r_s2[j] - mean_s2
            dev_m = r_m[j] - mean_m
            sum_cov1 += dev_s1 * dev_m
            sum_cov2 += dev_s2 * dev_m
            sum_var += dev_m * dev_m
        
        var_market = sum_var / (window - 1)
        if var_market != 0:
            betas_1[i] = (sum_cov1 / (window - 1)) / var_market
            betas_2[i] = (sum_cov2 / (window - 1)) / var_market
    
    # Compute beta correlation using valid betas only
    valid_mask = ~np.isnan(betas_1[window:]) & ~np.isnan(betas_2[window:])
    if np.sum(valid_mask) > 1:  # Need at least 2 points for correlation
        beta_corr = compute_pearson(
            betas_1[window:][valid_mask], 
            betas_2[window:][valid_mask]
        )
    else:
        beta_corr = np.nan
    
    return pearson_corr, beta_corr, r_squared