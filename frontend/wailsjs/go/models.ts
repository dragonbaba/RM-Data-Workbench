export namespace services {
	
	export class FileReadInfo {
	    exists: boolean;
	    size: number;
	    readBytes: number;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new FileReadInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.exists = source["exists"];
	        this.size = source["size"];
	        this.readBytes = source["readBytes"];
	        this.error = source["error"];
	    }
	}
	export class FileStat {
	    exists: boolean;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new FileStat(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.exists = source["exists"];
	        this.size = source["size"];
	    }
	}
	export class Workspace {
	    projectRoot: string;
	    dataPath: string;
	    scriptPath: string;
	    imagePath: string;
	    workspacePath: string;
	    projectName: string;
	    dataFiles: Record<string, string>;
	    lastOpenedFile: string;
	    lastOpenedFileType: string;
	
	    static createFrom(source: any = {}) {
	        return new Workspace(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectRoot = source["projectRoot"];
	        this.dataPath = source["dataPath"];
	        this.scriptPath = source["scriptPath"];
	        this.imagePath = source["imagePath"];
	        this.workspacePath = source["workspacePath"];
	        this.projectName = source["projectName"];
	        this.dataFiles = source["dataFiles"];
	        this.lastOpenedFile = source["lastOpenedFile"];
	        this.lastOpenedFileType = source["lastOpenedFileType"];
	    }
	}

}

