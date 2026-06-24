import { baseApi } from './baseApi'

// uploadsApi — CONTRACT.md §2.13. PhotoPicker posts each File here and stores the
// returned URL; consuming screens never see FormData or R2 directly.
export const uploadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadFile: build.mutation<{ url: string }, File>({
      query: (file) => {
        const formData = new FormData()
        formData.append('file', file)
        return { url: '/uploads', method: 'POST', body: formData }
      },
    }),
  }),
})

export const { useUploadFileMutation } = uploadsApi
