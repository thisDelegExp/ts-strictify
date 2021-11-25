import { GitOptions, findChangedFiles } from './lib/git'
import { TypeScriptOptions, compile } from './lib/typescript'
import { relative } from 'path'

export interface Args {
  typeScriptOptions: TypeScriptOptions
  gitOptions: GitOptions
  onFoundChangedFiles: (changedFiles: string[]) => void
  onExamineFile: (file: string) => void
  onCheckFile: (file: string, hasErrors: boolean) => void
}

export interface StrictifyResult {
  success: boolean
  errors: number
}

export const strictify = async (args: Args): Promise<StrictifyResult> => {
  const { onFoundChangedFiles, onCheckFile, typeScriptOptions, gitOptions } = args

  const changedFiles = await findChangedFiles(gitOptions).then((files) =>
    files.filter((fileName) => Boolean(fileName.match(/\.tsx?$/))),
  )
  onFoundChangedFiles(changedFiles)

  if (changedFiles.length === 0) {
    return { success: true, errors: 0 }
  }

  const tscOut = await compile(typeScriptOptions)
  const errorCount = changedFiles.reduce<number>((totalErrorCount, fileName) => {
    let errorCount = 0
    tscOut.map((line) => {
      if (line.includes(relative(process.cwd(), fileName).split('\\').join('/'))) {
        errorCount === 0 ? onCheckFile(fileName, true) : null
        totalErrorCount++
        errorCount++
        console.log(line)
      }
    })
    errorCount === 0 ? onCheckFile(fileName, false) : null
    return totalErrorCount
  }, 0)

  return {
    success: errorCount === 0,
    errors: errorCount,
  }
}
