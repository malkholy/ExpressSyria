USE [Express]
GO

PRINT '==================================================='
PRINT ' Express loyalty tables & procedure diagnostic script'
PRINT '==================================================='
PRINT ''

-- 1. Check Table Existences & Row Counts
PRINT '---------------------------------------------------'
PRINT 'Checking table existences...'
PRINT '---------------------------------------------------'

IF OBJECT_ID('[Express].[Stas].[PointChargingHistory]') IS NOT NULL
    SELECT 'PointChargingHistory' AS TableName, COUNT(*) AS RowCount FROM [Express].[Stas].[PointChargingHistory]
ELSE
    PRINT '❌ ERROR: [Express].[Stas].[PointChargingHistory] does not exist!'

IF OBJECT_ID('[Express].[Stas].[PointActivationHistory]') IS NOT NULL
    SELECT 'PointActivationHistory' AS TableName, COUNT(*) AS RowCount FROM [Express].[Stas].[PointActivationHistory]
ELSE
    PRINT '❌ ERROR: [Express].[Stas].[PointActivationHistory] does not exist!'

IF OBJECT_ID('[Express].[Stas].[PointRedemptionHistory]') IS NOT NULL
    SELECT 'PointRedemptionHistory' AS TableName, COUNT(*) AS RowCount FROM [Express].[Stas].[PointRedemptionHistory]
ELSE
    PRINT '❌ ERROR: [Express].[Stas].[PointRedemptionHistory] does not exist!'


-- 2. Find ClientMaster Schema & Table Name
PRINT ''
PRINT '---------------------------------------------------'
PRINT 'Searching for ClientMaster table and columns...'
PRINT '---------------------------------------------------'

DECLARE @ClientMasterObjectName NVARCHAR(250) = NULL

IF OBJECT_ID('[Express].[Stas].[ClientMaster]') IS NOT NULL
BEGIN
    SET @ClientMasterObjectName = '[Express].[Stas].[ClientMaster]'
    PRINT '✅ FOUND: ClientMaster exists as [Express].[Stas].[ClientMaster]'
END
ELSE IF OBJECT_ID('[Express].[dbo].[ClientMaster]') IS NOT NULL
BEGIN
    SET @ClientMasterObjectName = '[Express].[dbo].[ClientMaster]'
    PRINT '✅ FOUND: ClientMaster exists as [Express].[dbo].[ClientMaster]'
END
ELSE
BEGIN
    PRINT '❌ ERROR: ClientMaster was NOT found in Stas or dbo schemas!'
    -- Search sys.tables to see if it is named slightly differently
    SELECT 
        s.name AS SchemaName, 
        t.name AS TableName 
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE t.name LIKE '%Client%' OR t.name LIKE '%Master%'
END

-- If found, show its columns to verify key (GLCID) and name fields
IF @ClientMasterObjectName IS NOT NULL
BEGIN
    PRINT 'Listing columns of ' + @ClientMasterObjectName + ':'
    SELECT 
        c.name AS ColumnName,
        t.name AS DataType,
        c.max_length AS MaxLength,
        c.is_nullable AS IsNullable
    FROM sys.columns c
    INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(@ClientMasterObjectName)
    ORDER BY c.column_id
END


-- 3. Test Stored Procedure Execution
PRINT ''
PRINT '---------------------------------------------------'
PRINT 'Testing Stored Procedure [dbo].[APIExprssControlOperation]'
PRINT '---------------------------------------------------'

IF OBJECT_ID('[dbo].[APIExprssControlOperation]') IS NULL
BEGIN
    PRINT '❌ ERROR: Stored procedure [dbo].[APIExprssControlOperation] does not exist!'
    PRINT 'Please run the APIExprssControlOperation.sql script to create it.'
END
ELSE
BEGIN
    BEGIN TRY
        PRINT 'Executing: Get Control Data By Period...'
        EXEC [dbo].[APIExprssControlOperation]
            @Operation = 'Get Control Data By Period',
            @LineData = '{"Period":"monthly","Months":"6","Quarter":0,"Year":2026}',
            @Year = 2026,
            @Month = 6

        PRINT 'Executing: Get Express Details By Period...'
        EXEC [dbo].[APIExprssControlOperation]
            @Operation = 'Get Express Details By Period',
            @LineData = '{"Period":"monthly","Months":"6","Quarter":0,"Year":2026}',
            @Year = 2026,
            @Month = 6
            
        PRINT '✅ Execution completed successfully!'
    END TRY
    BEGIN CATCH
        PRINT '❌ ERROR: Stored Procedure execution failed!'
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR(10))
        PRINT 'Error Message: ' + ERROR_MESSAGE()
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS VARCHAR(10))
    END CATCH
END
GO
