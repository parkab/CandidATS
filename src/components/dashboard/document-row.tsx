type DocumentRowProps = {
    job: string;
    document: string;
    lastUpdated: string;
    status: string;
}


export default function DocumentRow({job, document, lastUpdated, status}: DocumentRowProps) {
    return (
        <tr>
            <td>{job}</td>
            <td>{document}</td>
            <td>{lastUpdated}</td>
            <td>{status}</td>
        </tr>
    );
}