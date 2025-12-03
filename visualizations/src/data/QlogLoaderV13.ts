import QlogConnectionGroup from '@/data/ConnectionGroup';
import QlogConnection from '@/data/Connection';
import { IQlogRawEvent } from '@/data/QlogEventParser';
import { DirectEventParser } from '@/data/QlogLoaderV2';
import * as qlog02 from '@/data/QlogSchema02';

export class QlogLoaderV13 {

    public static fromJSON(json:any) : QlogConnectionGroup | undefined {

        if ( json && (json.qlog_version === "qlog-v13" || json.file_schema === "urn:ietf:params:qlog:file:sequential") ){
            return QlogLoaderV13.fromDraft13(json);
        }

        return undefined;
    }

    protected static fromDraft13(json:any) : QlogConnectionGroup {

        const fileContents:any = json;

        const group = new QlogConnectionGroup();
        group.version = fileContents.qlog_version || "qlog-v13";
        group.title = fileContents.title || "";
        group.description = fileContents.description || "";

        const traces:Array<any> = fileContents.traces || (fileContents.trace ? [fileContents.trace] : []);

        for ( const jsonconnection of traces ){

            if ( !jsonconnection ){
                continue;
            }

            const qlogconnections:Array<QlogConnection> = new Array<QlogConnection>();

            const events:Array<IQlogRawEvent> = jsonconnection.events || [];
            const groupLUT:Map<string, QlogConnection> = new Map<string, QlogConnection>();

            if ( (jsonconnection.common_fields && jsonconnection.common_fields.group_id !== undefined) || ( events.length > 0 && (events[0] as any).group_id !== undefined ) ) {

                for ( const event of events ){

                    let groupID:any = (event as any).group_id;
                    if ( groupID === undefined ){
                        groupID = jsonconnection.common_fields ? jsonconnection.common_fields.group_id : undefined;
                    }

                    if ( groupID === undefined ){
                        groupID = "undefined";
                    }

                    if ( typeof groupID !== "string" ) {
                        groupID = JSON.stringify(groupID);
                    }

                    let conn = groupLUT.get(groupID as string);
                    if ( !conn ){
                        conn = new QlogConnection(group);
                        conn.title = "Group " + groupID + " : ";
                        groupLUT.set( groupID as string, conn );

                        qlogconnections.push( conn );
                    }

                    conn.getEvents().push( event as any );
                }
            }
            else {
                const conn = new QlogConnection(group);
                qlogconnections.push( conn );
                conn.setEvents( events as any );
            }

            for ( const connection of qlogconnections ){

                connection.title += jsonconnection.title ? jsonconnection.title : "";
                connection.description += jsonconnection.description ? jsonconnection.description : "";

                connection.vantagePoint = jsonconnection.vantage_point || {} as qlog02.IVantagePoint;

                if ( !connection.vantagePoint.type ){
                    connection.vantagePoint.type = qlog02.VantagePointType.unknown;
                    connection.vantagePoint.flow = qlog02.VantagePointType.unknown;
                    connection.vantagePoint.name = "No VantagePoint set";
                }

                connection.eventFieldNames = ["time", "category", "event_type", "data"];
                connection.commonFields = jsonconnection.common_fields || {} as any;
                connection.configuration = jsonconnection.configuration || {};

                connection.setEventParser( new DirectEventParser() );
            }
        }

        return group;
    }
}

export default QlogLoaderV13;
