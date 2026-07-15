alter  PROCEDURE [dbo].[APIPanelOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
AS
BEGIN
    SET @Message = ''
    SET @State = 0 

    IF @Operation = 'Login'
    BEGIN
        CREATE TABLE #TempLogin (Username nvarchar(100), Password nvarchar(100))
        INSERT INTO #TempLogin SELECT * FROM openjson(@LineData) WITH (
            Username nvarchar(100) '$.Username',
            Password nvarchar(100) '$.Password'
        )

        DECLARE @Username nvarchar(100) = '', @Password nvarchar(100) = ''
        
        SELECT @Username = Username, @Password = Password FROM #TempLogin
        IF @Username = 'sysadmin' AND (@Password = '1' OR @Password = 'sysadmin') 
        BEGIN
            -- Return the user details in a result set so it is mapped to List0 in the frontend
            SELECT @Username AS Username, 'System Admin' AS Name
            DROP TABLE #TempLogin
            RETURN
        END 
        ELSE	
        BEGIN 
            SET @State = 1
            SET @Message = 'Invalid username or password'
            DROP TABLE #TempLogin
            RETURN
        END
    END

    IF @Operation = 'GetClientMaster'
    BEGIN
        SELECT a.GLCID, a.Name, a.Job, a.Mobile, a.Address, a.GovermentID, b.ArabicName, c.Balance, a.CreatedDate   
        FROM ClientMaster a 
        LEFT OUTER JOIN GovermentMaster b ON a.GovermentID = b.GovermentID 
        LEFT OUTER JOIN PointBalance c ON c.ClientID = a.GLCID
        RETURN
    END

    IF @Operation = 'GetClientDetail'
    BEGIN
        DECLARE @ClientID INT = 0
        SELECT @ClientID = ClientID FROM openjson(@LineData) WITH (
            ClientID INT '$.ClientID'
        )

        -- List0: Client Details
        SELECT a.GLCID, a.Name, a.Job, a.Mobile, a.Address, a.GovermentID, b.ArabicName, c.Balance, a.CreatedDate   
        FROM ClientMaster a 
        LEFT OUTER JOIN GovermentMaster b ON a.GovermentID = b.GovermentID 
        LEFT OUTER JOIN PointBalance c ON c.ClientID = a.GLCID
        WHERE a.GLCID = @ClientID

		select x.TransactionDate , x.ClientID , x.Point , x.Code , x.CardSerial , x.GiftName  from  PointHistory x where ClientID=@ClientID 
    END

	if @Operation = 'GetGovernorates'
	begin
		select GovermentID, ArabicName from GovermentMaster order by ArabicName
		return
	end

	if @Operation = 'UpdateClientProfile'
	begin
		declare @UpClientID int = 0, @UpJob nvarchar(250) = '', @UpGovermentID int = 0, @UpAddress nvarchar(max) = ''
		select 
			@UpClientID = ClientID,
			@UpJob = Job,
			@UpGovermentID = GovermentID,
			@UpAddress = Address
		from openjson(@LineData) with (
			ClientID int '$.ClientID',
			Job nvarchar(250) '$.Job',
			GovermentID int '$.GovermentID',
			Address nvarchar(max) '$.Address'
		)

		update ClientMaster
		set Job = @UpJob,
			GovermentID = @UpGovermentID,
			Address = @UpAddress
		where GLCID = @UpClientID

		set @State = 0
		set @Message = 'Profile updated successfully'
		return
	end

    IF @Operation = 'GetClientRequest'
    BEGIN
        SELECT a.[RequestNo]
              ,a.[RequestDate]
              ,a.[ClientID]
              ,a.[RequestState]
              ,a.[GiftID]
              ,a.[GiftPoint]
              ,a.[GiftName]
              ,a.[GiftAmount]
              ,a.[RedemptionDate]
              ,a.[RejectedDate]
              ,a.[RejectedReasonID]
              ,a.[Note]
              ,a.[VoucherNo]
              ,a.[CargoName]
              ,a.[TrackingNumber]
              ,a.[CreatedBy]
              ,a.[CreatedDate]
              ,a.[LastMaintDate]
              ,a.[LastMaintBy] 
              ,b.stateDescription
              ,c.ShamCashCode
              ,d.GiftAmount AS GiftMasterAmount
              ,d.IsChargingCard
              ,d.IsWallet
              ,e.Mobile AS ClientMobile
              ,e.Name AS ClientName
        FROM ClientRequestHistory a 
        LEFT OUTER JOIN ClientRequestState b ON a.RequestState = b.stateID 
        LEFT OUTER JOIN ClientShamCash c ON a.ClientID = c.ClientID
        LEFT OUTER JOIN GiftMaster d ON a.GiftID = d.GiftID
        LEFT OUTER JOIN ClientMaster e ON a.ClientID = e.GLCID
        ORDER BY a.RequestDate DESC
        RETURN
    END
	if @operation='Transfer'
	begin
		Declare @RequestNo int =0 , @RequestState int =0
		set @RequestNo = convert ( int , @LineData ) 
		select @RequestState=RequestState from ClientRequestHistory where RequestNo=@RequestNo
		if @RequestState=10
		begin 
			exec RequestRedemption @RequestNo 
			return 
		end 
		return
	end 

	if @Operation = 'AssignShamCash'
	begin
		declare @ClientID_SC int = 0, @ShamCashCode nvarchar(100) = ''
		select @ClientID_SC = ClientID, @ShamCashCode = ShamCashCode 
		from openjson(@LineData) with (
			ClientID int '$.ClientID',
			ShamCashCode nvarchar(100) '$.ShamCashCode'
		)

		if not exists (select 1 from ClientShamCash where ClientID = @ClientID_SC)
		begin
			insert into ClientShamCash (ClientID, ShamCashCode)
			values (@ClientID_SC, @ShamCashCode)
		end
		else
		begin
			update ClientShamCash 
			set ShamCashCode = @ShamCashCode
			where ClientID = @ClientID_SC
		end
		return
	end

	if @Operation = 'GetExpressStatistics'
	begin
		declare @Period nvarchar(50) = '', @Months nvarchar(max) = '', @Quarter int = 0, @Year int = 0
		select @Period = Period, @Months = Months, @Quarter = Quarter, @Year = Year
		from openjson(@LineData) with (
			Period nvarchar(50) '$.Period',
			Months nvarchar(max) '$.Months',
			Quarter int '$.Quarter',
			Year int '$.Year'
		)

		if @Months is null or @Months = ''
		begin
			set @Months = '0'
		end

		-- List0: KPI totals
		declare @TotalGiftAmount decimal(18, 2) = 0
		select @TotalGiftAmount = isnull(sum(GiftAmount), 0)
		from ClientRequestHistory
		where year(RequestDate) = @Year
		  and (
			@Period = 'yearly' 
			or month(RequestDate) in (select convert(int, value) from openjson('[' + @Months + ']'))
		  )

		select 
			count(distinct ClientID) as TotalActiveClients,
			count(distinct CardSerial) as TotalChargingCards,
			case when count(distinct CardSerial) > 0 then sum(Point) / count(distinct CardSerial) else 0 end as AvgCardPoint,
			@TotalGiftAmount as TotalValue
		from PointHistory
		where year(TransactionDate) = @Year
		  and (
			@Period = 'yearly' 
			or month(TransactionDate) in (select convert(int, value) from openjson('[' + @Months + ']'))
		  )

		-- List1: Monthly active clients trend (1 to 12)
		select 
			m.MonthVal,
			isnull(t.ActiveClients, 0) as ActiveClients
		from (
			select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all
			select 5 union all select 6 union all select 7 union all select 8 union all
			select 9 union all select 10 union all select 11 union all select 12
		) m
		left outer join (
			select 
				month(TransactionDate) as MonthVal,
				count(distinct ClientID) as ActiveClients
			from PointHistory
			where year(TransactionDate) = @Year
			group by month(TransactionDate)
		) t on m.MonthVal = t.MonthVal
		order by m.MonthVal

		-- List2: Total Active Clients Per Governorate
		select 
			isnull(g.ArabicName, 'Unknown') as Governorate,
			count(distinct ph.ClientID) as ActiveClients
		from PointHistory ph
		left outer join ClientMaster cm on ph.ClientID = cm.GLCID
		left outer join GovermentMaster g on cm.GovermentID = g.GovermentID
		where year(ph.TransactionDate) = @Year
		  and (
			@Period = 'yearly' 
			or month(ph.TransactionDate) in (select convert(int, value) from openjson('[' + @Months + ']'))
		  )
		group by g.ArabicName
		order by count(distinct ph.ClientID) desc

		-- List3: Monthly trend of total requests (1 to 12)
		select 
			m.MonthVal,
			isnull(t.TotalRequests, 0) as TotalRequests
		from (
			select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all
			select 5 union all select 6 union all select 7 union all select 8 union all
			select 9 union all select 10 union all select 11 union all select 12
		) m
		left outer join (
			select 
				month(RequestDate) as MonthVal,
				count(RequestNo) as TotalRequests
			from ClientRequestHistory
			where year(RequestDate) = @Year
			group by month(RequestDate)
		) t on m.MonthVal = t.MonthVal
		order by m.MonthVal

		-- List4: Monthly trend of newly joined clients (1 to 12)
		select 
			m.MonthVal,
			isnull(t.JoinedClients, 0) as JoinedClients
		from (
			select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all
			select 5 union all select 6 union all select 7 union all select 8 union all
			select 9 union all select 10 union all select 11 union all select 12
		) m
		left outer join (
			select 
				month(CreatedDate) as MonthVal,
				count(GLCID) as JoinedClients
			from ClientMaster
			where year(CreatedDate) = @Year
			group by month(CreatedDate)
		) t on m.MonthVal = t.MonthVal
		order by m.MonthVal

		-- List5: Top 50 Clients by Balance
		select top 50 
			c.GLCID,
			c.Name,
			c.Job,
			c.Mobile,
			g.ArabicName as Governorate,
			isnull(pb.Balance, 0) as Balance
		from ClientMaster c
		left outer join PointBalance pb on c.GLCID = pb.ClientID
		left outer join GovermentMaster g on c.GovermentID = g.GovermentID
		order by isnull(pb.Balance, 0) desc

		-- List6: Total requests per gift
		select 
			isnull(r.GiftName, 'Unknown') as GiftName,
			count(r.RequestNo) as TotalRequests,
			isnull(sum(r.GiftAmount), 0) as TotalAmount,
			isnull(sum(r.GiftPoint ), 0) as TotalPoints
		from ClientRequestHistory r
		where year(r.RequestDate) = @Year
		  and (
			@Period = 'yearly' 
			or month(r.RequestDate) in (select convert(int, value) from openjson('[' + @Months + ']'))
		  )
		group by r.GiftName
		order by count(r.RequestNo) desc

		-- List7: Top 50 Clients by Redemption
		select top 50 
			c.GLCID,
			c.Name,
			c.Job,
			c.Mobile,
			g.ArabicName as Governorate,
			isnull(sum(r.GiftPoint ), 0) as TotalGiftPoints
		from ClientMaster c
		join ClientRequestHistory r on c.GLCID = r.ClientID
		left outer join GovermentMaster g on c.GovermentID = g.GovermentID
		where year(r.RequestDate) = @Year
		  and (
			@Period = 'yearly' 
			or month(r.RequestDate) in (select convert(int, value) from openjson('[' + @Months + ']'))
		  )
		group by c.GLCID, c.Name, c.Job, c.Mobile, g.ArabicName
		order by isnull(sum(r.GiftPoint * r.GiftAmount), 0) desc

		return
	end

	if @Operation = 'GetExpressBarClients'
	begin
		declare @SelYear int = 0, @SelMonth int = 0, @SelType nvarchar(50) = ''
		select @SelYear = Year, @SelMonth = Month, @SelType = Type
		from openjson(@LineData) with (
			Year int '$.Year',
			Month int '$.Month',
			Type nvarchar(50) '$.Type'
		)

		if @SelType = 'active'
		begin
			select distinct 
				c.GLCID, 
				c.Name, 
				c.Job, 
				c.Mobile, 
				g.ArabicName as Governorate,
				count(p.Code) as TransactionCount,
				sum(p.Point) as TotalPoints
			from PointHistory p
			join ClientMaster c on p.ClientID = c.GLCID
			left join GovermentMaster g on c.GovermentID = g.GovermentID
			where year(p.TransactionDate) = @SelYear and month(p.TransactionDate) = @SelMonth
			group by c.GLCID, c.Name, c.Job, c.Mobile, g.ArabicName
			order by sum(p.Point) desc
			return
		end

		if @SelType = 'requests'
		begin
			select distinct 
				c.GLCID, 
				c.Name, 
				c.Job, 
				c.Mobile, 
				g.ArabicName as Governorate,
				count(r.RequestNo) as RequestCount,
				sum(r.GiftPoint) as TotalPoints
			from ClientRequestHistory r
			join ClientMaster c on r.ClientID = c.GLCID
			left join GovermentMaster g on c.GovermentID = g.GovermentID
			where year(r.RequestDate) = @SelYear and month(r.RequestDate) = @SelMonth
			group by c.GLCID, c.Name, c.Job, c.Mobile, g.ArabicName
			order by count(r.RequestNo) desc
			return
		end

		if @SelType = 'joined'
		begin
			select 
				c.GLCID, 
				c.Name, 
				c.Job, 
				c.Mobile, 
				g.ArabicName as Governorate,
				c.CreatedDate
			from ClientMaster c
			left join GovermentMaster g on c.GovermentID = g.GovermentID
			where year(c.CreatedDate) = @SelYear and month(c.CreatedDate) = @SelMonth
			order by c.CreatedDate desc
			return
		end
	end

	if @operation='GetColorCenters'
	begin
		SELECT
			  [ShopId]
			  ,[ShopName]
			  ,[Address]
			  ,[GovermentName]
			  ,[CityName]
			  ,[Mobile]
			  ,[Longitude]
			  ,[Latitude]
		  FROM [ColorCenterMaster]
		return
	end

END
GO
