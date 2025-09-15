async fetchContinueLearning(videoId: string): Promise<void> {
    let userId
    if (this.configSvc.userProfile) {
      userId = this.configSvc.userProfile.userId || ''
    }
    if (this.activatedRoute.snapshot.queryParams.collectionId &&
      this.activatedRoute.snapshot.queryParams.batchId &&
      videoId
    ) {
      const requestCourse = this.viewerSvc.getBatchIdAndCourseId(
        this.activatedRoute.snapshot.queryParams.collectionId,
        this.activatedRoute.snapshot.queryParams.batchId,
        videoId)
      const language = this.viewerSvc.getResourceContentLanguage(videoId)
      const req: NsContent.IContinueLearningDataReq = {
        request: {
          userId,
          language,
          batchId: requestCourse.batchId,
          courseId: requestCourse.courseId || '',
          contentIds: [],
          fields: ['progressdetails'],
        },
      }
      try {
        const data: any = await this.contentSvc.fetchContentHistoryV2(req).toPromise()
        if (data && data.result && data.result.contentList.length) {
          this.contentSvc.setProgramChildResumeData(data.result.contentList, requestCourse.courseId)
          for (const content of data.result.contentList) {
            if (
              content.contentId === videoId &&
              content.progressdetails &&
              content.progressdetails.current &&
              this.widgetResolverVideoData
            ) {
              if (content.progress === 100 || content.status === 2) {
                // if its completed then resume from starting
                this.widgetResolverVideoData.widgetData.resumePoint = 0
              } else {
                // resume from last played point
                this.widgetResolverVideoData.widgetData.resumePoint = Number(
                  content.progressdetails.current.pop(),
                )
                console.log('resume from last played point--->', this.widgetResolverVideoData.widgetData)
                }
            }
          }
        }
      } catch (e) {
        // ignore error
      }
    }
    return
  }